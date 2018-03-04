const Web3 = require("web3");
const solc = require("solc");
let web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

let getBalance = (acc) => {
  return new Promise((res, rej) => {
    let balance = web3.eth.getBalance(acc).then((data, error) => {
      if (!error) {
        let ethers = web3.utils.fromWei(data, "ether");
        res(ethers);
      } else {
        rej("Requesting balance failed.");
      }
    });
  }).catch((e) => {
    console.error(e)
  })
}

let source = `pragma solidity ^0.4.20;
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
`

let main = async () => {
  let accounts = await web3.eth.getAccounts();
  let buyer = accounts[0];
  let seller = accounts[1];
  let arbiter = accounts[2];
  let priceOfObjectOfPurchase = web3.utils.toWei('5', "ether");

  // compile the solidity code
  let compiled = solc.compile(source);

  // save public interface of contract
  let abi = JSON.parse(compiled.contracts[":Escrow"].interface)

  // create var with contract
  let Escrow = new web3.eth.Contract(abi);

  console.log("Before:");
  console.log("\tBuyer: " + await getBalance(buyer));
  console.log("\tSeller: " + await getBalance(seller));
  console.log("\tArbiter: " + await getBalance(arbiter));
  console.log("\tContract: 0\n");

  // deploy contract
  let deployContractTx = Escrow.deploy({
    data: compiled.contracts[':Escrow'].bytecode,
    arguments: [seller, arbiter]
  });

  let calculatedGas = await deployContractTx.estimateGas();

  let contractInstance = await deployContractTx.send({
    from: buyer,
    gas: calculatedGas,
    value: priceOfObjectOfPurchase
  });

  console.log("After sending the contract:");
  console.log("\tBuyer: " + await getBalance(buyer));
  console.log("\tSeller: " + await getBalance(seller));
  console.log("\tArbiter: " + await getBalance(arbiter));
  console.log("\tContract: " + await getBalance(contractInstance.options.address) + "\n");

  // send instead of call. Otherwise, the method invocation has no effect
  await contractInstance.methods.payoutToSeller().send({
    from: arbiter
  });

  console.log("After the arbiter allowed the payout:");
  console.log("\tBuyer: " + await getBalance(buyer));
  console.log("\tSeller: " + await getBalance(seller));
  console.log("\tArbiter: " + await getBalance(arbiter));
  console.log("\tContract: " + await getBalance(contractInstance.options.address) + "\n");

}

main();