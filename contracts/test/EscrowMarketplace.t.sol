// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {EscrowMarketplace} from "../src/EscrowMarketplace.sol";

contract EscrowMarketplaceTest is Test {
    EscrowMarketplace public escrow;

    address public admin = address(0x1);
    address public buyer = address(0x2);
    address public seller = address(0x3);
    address public stranger = address(0x4);

    uint256 public constant ORDER_AMOUNT = 1 ether;

    event OrderCreated(uint256 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event FundsDeposited(uint256 indexed orderId, address indexed buyer, uint256 amount);
    event OrderFulfilled(uint256 indexed orderId, address indexed seller);
    event FundsReleased(uint256 indexed orderId, address indexed seller, uint256 amount);
    event DisputeRaised(uint256 indexed orderId, address indexed raisedBy);
    event DisputeResolved(uint256 indexed orderId, address indexed winner, uint256 amount);

    function setUp() public {
        escrow = new EscrowMarketplace(admin);
        vm.deal(buyer, 10 ether);
        vm.deal(seller, 1 ether);
        vm.deal(stranger, 1 ether);
    }

    function test_CreateOrder() public {
        vm.expectEmit(true, true, true, true);
        emit OrderCreated(1, buyer, seller, ORDER_AMOUNT);

        vm.prank(buyer);
        uint256 orderId = escrow.createOrder(buyer, seller, ORDER_AMOUNT);

        assertEq(orderId, 1);
        assertEq(escrow.orderCount(), 1);

        EscrowMarketplace.Order memory order = escrow.getOrder(orderId);
        assertEq(order.id, 1);
        assertEq(order.buyer, buyer);
        assertEq(order.seller, seller);
        assertEq(order.amount, ORDER_AMOUNT);
        assertEq(uint256(order.status), uint256(EscrowMarketplace.OrderStatus.PENDING));
    }

    function test_DepositFunds() public {
        vm.prank(buyer);
        uint256 orderId = escrow.createOrder(buyer, seller, ORDER_AMOUNT);

        vm.expectEmit(true, true, false, true);
        emit FundsDeposited(orderId, buyer, ORDER_AMOUNT);

        vm.prank(buyer);
        escrow.depositFunds{value: ORDER_AMOUNT}(orderId);

        EscrowMarketplace.Order memory order = escrow.getOrder(orderId);
        assertEq(uint256(order.status), uint256(EscrowMarketplace.OrderStatus.FUNDED));
        assertEq(address(escrow).balance, ORDER_AMOUNT);
    }

    function test_MarkFulfilled() public {
        vm.prank(buyer);
        uint256 orderId = escrow.createOrder(buyer, seller, ORDER_AMOUNT);

        vm.prank(buyer);
        escrow.depositFunds{value: ORDER_AMOUNT}(orderId);

        vm.expectEmit(true, true, false, false);
        emit OrderFulfilled(orderId, seller);

        vm.prank(seller);
        escrow.markFulfilled(orderId);

        EscrowMarketplace.Order memory order = escrow.getOrder(orderId);
        assertEq(uint256(order.status), uint256(EscrowMarketplace.OrderStatus.FULFILLED));
    }

    function test_ReleaseFunds() public {
        vm.prank(buyer);
        uint256 orderId = escrow.createOrder(buyer, seller, ORDER_AMOUNT);

        vm.prank(buyer);
        escrow.depositFunds{value: ORDER_AMOUNT}(orderId);

        vm.prank(seller);
        escrow.markFulfilled(orderId);

        uint256 sellerBalanceBefore = seller.balance;

        vm.expectEmit(true, true, false, true);
        emit FundsReleased(orderId, seller, ORDER_AMOUNT);

        vm.prank(buyer);
        escrow.releaseFunds(orderId);

        EscrowMarketplace.Order memory order = escrow.getOrder(orderId);
        assertEq(uint256(order.status), uint256(EscrowMarketplace.OrderStatus.RELEASED));
        assertEq(seller.balance, sellerBalanceBefore + ORDER_AMOUNT);
        assertEq(address(escrow).balance, 0);
    }

    function test_RaiseDispute() public {
        vm.prank(buyer);
        uint256 orderId = escrow.createOrder(buyer, seller, ORDER_AMOUNT);

        vm.prank(buyer);
        escrow.depositFunds{value: ORDER_AMOUNT}(orderId);

        vm.expectEmit(true, true, false, false);
        emit DisputeRaised(orderId, buyer);

        vm.prank(buyer);
        escrow.raiseDispute(orderId);

        EscrowMarketplace.Order memory order = escrow.getOrder(orderId);
        assertEq(uint256(order.status), uint256(EscrowMarketplace.OrderStatus.DISPUTED));
    }

    function test_ResolveDispute() public {
        vm.prank(buyer);
        uint256 orderId = escrow.createOrder(buyer, seller, ORDER_AMOUNT);

        vm.prank(buyer);
        escrow.depositFunds{value: ORDER_AMOUNT}(orderId);

        vm.prank(buyer);
        escrow.raiseDispute(orderId);

        uint256 sellerBalanceBefore = seller.balance;

        vm.expectEmit(true, true, false, true);
        emit DisputeResolved(orderId, seller, ORDER_AMOUNT);

        vm.prank(admin);
        escrow.resolveDispute(orderId, seller);

        EscrowMarketplace.Order memory order = escrow.getOrder(orderId);
        assertEq(uint256(order.status), uint256(EscrowMarketplace.OrderStatus.RESOLVED));
        assertEq(seller.balance, sellerBalanceBefore + ORDER_AMOUNT);
    }

    function test_RevertOnUnauthorized() public {
        vm.prank(buyer);
        uint256 orderId = escrow.createOrder(buyer, seller, ORDER_AMOUNT);

        vm.prank(buyer);
        escrow.depositFunds{value: ORDER_AMOUNT}(orderId);

        // stranger cannot mark fulfilled
        vm.prank(stranger);
        vm.expectRevert("EscrowMarketplace: caller is not the seller");
        escrow.markFulfilled(orderId);

        // seller cannot deposit
        vm.prank(seller);
        vm.expectRevert("EscrowMarketplace: caller is not the buyer");
        escrow.depositFunds{value: ORDER_AMOUNT}(orderId);

        // stranger cannot resolve dispute
        vm.prank(seller);
        escrow.markFulfilled(orderId);

        vm.prank(buyer);
        escrow.raiseDispute(orderId);

        vm.prank(stranger);
        vm.expectRevert();
        escrow.resolveDispute(orderId, seller);
    }

    function test_RevertOnWrongAmount() public {
        vm.prank(buyer);
        uint256 orderId = escrow.createOrder(buyer, seller, ORDER_AMOUNT);

        vm.prank(buyer);
        vm.expectRevert("EscrowMarketplace: incorrect deposit amount");
        escrow.depositFunds{value: 0.5 ether}(orderId);
    }

    function test_RevertOnInvalidOrder() public {
        vm.expectRevert("EscrowMarketplace: order does not exist");
        escrow.getOrder(999);
    }

    function test_MultipleOrders() public {
        vm.startPrank(buyer);
        uint256 orderId1 = escrow.createOrder(buyer, seller, 1 ether);
        uint256 orderId2 = escrow.createOrder(buyer, seller, 2 ether);
        vm.stopPrank();

        assertEq(orderId1, 1);
        assertEq(orderId2, 2);
        assertEq(escrow.orderCount(), 2);
    }
}
