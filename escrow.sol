pragma solidity ^0.4.20;
contract Escrow {
  address public buyer;
  address public seller;
  address public arbiter;

  function Escrow(address _seller, address _arbiter) public payable { 
    buyer = msg.sender;
    seller = _seller;
    arbiter = _arbiter;
  }

  function payoutToSeller() public {
    if (msg.sender == arbiter || msg.sender == buyer) {
      seller.send(this.balance); // this = contract
    }
  }

  function refundBuyer() public {
    if (msg.sender == arbiter || msg.sender == seller) {
      buyer.send(this.balance);
    }
  }

  function getBalance() constant returns (uint) {
    return this.balance;
  }
}