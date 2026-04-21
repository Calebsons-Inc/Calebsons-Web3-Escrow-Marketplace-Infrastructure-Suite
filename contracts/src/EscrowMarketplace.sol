// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract EscrowMarketplace is ReentrancyGuard, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    enum OrderStatus {
        PENDING,
        FUNDED,
        FULFILLED,
        RELEASED,
        DISPUTED,
        RESOLVED
    }

    struct Order {
        uint256 id;
        address buyer;
        address seller;
        uint256 amount;
        OrderStatus status;
        uint256 createdAt;
        uint256 fulfillmentDeadline;
    }

    mapping(uint256 => Order) public orders;
    uint256 public orderCount;
    address public admin;

    event OrderCreated(uint256 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event FundsDeposited(uint256 indexed orderId, address indexed buyer, uint256 amount);
    event OrderFulfilled(uint256 indexed orderId, address indexed seller);
    event FundsReleased(uint256 indexed orderId, address indexed seller, uint256 amount);
    event DisputeRaised(uint256 indexed orderId, address indexed raisedBy);
    event DisputeResolved(uint256 indexed orderId, address indexed winner, uint256 amount);

    modifier onlyBuyer(uint256 orderId) {
        require(orders[orderId].buyer == msg.sender, "EscrowMarketplace: caller is not the buyer");
        _;
    }

    modifier onlySeller(uint256 orderId) {
        require(orders[orderId].seller == msg.sender, "EscrowMarketplace: caller is not the seller");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "EscrowMarketplace: caller is not admin");
        _;
    }

    modifier orderExists(uint256 orderId) {
        require(orderId > 0 && orderId <= orderCount, "EscrowMarketplace: order does not exist");
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "EscrowMarketplace: invalid admin address");
        admin = _admin;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    function createOrder(
        address buyer,
        address seller,
        uint256 amount
    ) external returns (uint256) {
        require(buyer != address(0), "EscrowMarketplace: invalid buyer address");
        require(seller != address(0), "EscrowMarketplace: invalid seller address");
        require(buyer != seller, "EscrowMarketplace: buyer and seller cannot be the same");
        require(amount > 0, "EscrowMarketplace: amount must be greater than zero");

        orderCount++;
        uint256 orderId = orderCount;

        orders[orderId] = Order({
            id: orderId,
            buyer: buyer,
            seller: seller,
            amount: amount,
            status: OrderStatus.PENDING,
            createdAt: block.timestamp,
            fulfillmentDeadline: block.timestamp + 7 days
        });

        emit OrderCreated(orderId, buyer, seller, amount);
        return orderId;
    }

    function depositFunds(uint256 orderId)
        external
        payable
        nonReentrant
        orderExists(orderId)
        onlyBuyer(orderId)
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PENDING, "EscrowMarketplace: order is not in PENDING status");
        require(msg.value == order.amount, "EscrowMarketplace: incorrect deposit amount");

        order.status = OrderStatus.FUNDED;
        emit FundsDeposited(orderId, msg.sender, msg.value);
    }

    function markFulfilled(uint256 orderId)
        external
        orderExists(orderId)
        onlySeller(orderId)
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.FUNDED, "EscrowMarketplace: order is not in FUNDED status");

        order.status = OrderStatus.FULFILLED;
        emit OrderFulfilled(orderId, msg.sender);
    }

    function releaseFunds(uint256 orderId)
        external
        nonReentrant
        orderExists(orderId)
        onlyBuyer(orderId)
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.FULFILLED, "EscrowMarketplace: order is not in FULFILLED status");

        order.status = OrderStatus.RELEASED;
        uint256 amount = order.amount;

        (bool success, ) = payable(order.seller).call{value: amount}("");
        require(success, "EscrowMarketplace: transfer failed");

        emit FundsReleased(orderId, order.seller, amount);
    }

    function raiseDispute(uint256 orderId)
        external
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(
            msg.sender == order.buyer || msg.sender == order.seller,
            "EscrowMarketplace: caller is not a party to this order"
        );
        require(
            order.status == OrderStatus.FUNDED || order.status == OrderStatus.FULFILLED,
            "EscrowMarketplace: cannot raise dispute in current status"
        );

        order.status = OrderStatus.DISPUTED;
        emit DisputeRaised(orderId, msg.sender);
    }

    function resolveDispute(uint256 orderId, address winner)
        external
        nonReentrant
        orderExists(orderId)
        onlyAdmin
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.DISPUTED, "EscrowMarketplace: order is not in DISPUTED status");
        require(
            winner == order.buyer || winner == order.seller,
            "EscrowMarketplace: winner must be buyer or seller"
        );

        order.status = OrderStatus.RESOLVED;
        uint256 amount = order.amount;

        (bool success, ) = payable(winner).call{value: amount}("");
        require(success, "EscrowMarketplace: transfer failed");

        emit DisputeResolved(orderId, winner, amount);
    }

    function getOrder(uint256 orderId)
        external
        view
        orderExists(orderId)
        returns (Order memory)
    {
        return orders[orderId];
    }
}
