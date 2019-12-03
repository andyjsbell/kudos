const UserRole = artifacts.require("./UserRole.sol");
const truffleAssert = require('truffle-assertions');
const { toBN, /*stringToHex, toWei,*/ keccak256 } = web3.utils;

contract("UserRole", async accounts => {

    let [owner, user1, user2] = accounts; 
    let userRoleInstance;
    const invalidAddress = '0x0000000000000000000000000000000000000000';
    
    before("prepare some things", async function() {
        
        userRoleInstance = await UserRole.deployed();
    });
});