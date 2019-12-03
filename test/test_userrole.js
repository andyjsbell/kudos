const UserRole = artifacts.require("./UserRole.sol");
const truffleAssert = require('truffle-assertions');
const { toBN, /*stringToHex, toWei,*/ keccak256 } = web3.utils;

contract("UserRole", async accounts => {

    let [owner, user1, user2] = accounts; 
    let userRoleInstance;
    const invalidId = '0x0000000000000000000000000000000000000000';
    const hash1 = keccak256('hash1');
    const hash2 = keccak256('hash2');
    
    before("prepare some things", async function() {
        
        userRoleInstance = await UserRole.deployed();
    });

    it('should add me as a user with a valid bytes32 value', async function() {
        let txObj = await userRoleInstance.updateUser(hash1, {from:user1});
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logUserUpdated = txObj.logs[0];
        assert.strictEqual(logUserUpdated.event, "UserUpdated");

        const chainHash = await userRoleInstance.users.call(user1);
        assert.strictEqual(hash1, chainHash);
    });

    it('should fail with an invalid bytes32', async function() {
        await truffleAssert.reverts(userRoleInstance.updateUser(invalidId, {from:user1}), 
                                    'Invalid id');
    });

    it('should update the id', async function() {
        await userRoleInstance.updateUser(hash2, {from:user1});
        const chainHash = await userRoleInstance.users.call(user1);
        assert.strictEqual(hash2, chainHash);
    });

    it('should be able to remove user', async function() {
        let txObj = await userRoleInstance.removeUser(user1, {from:owner});
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logUserRemoved = txObj.logs[0];
        assert.strictEqual(logUserRemoved.event, "UserRemoved");

        const chainHash = await userRoleInstance.users.call(user1);
        assert.strictEqual(chainHash[0], '0');
    });

    it('should fail removing user if not owner nor user', async function() {
        await truffleAssert.reverts(userRoleInstance.removeUser(user1, {from:user2}), 
                                    'Not authorised');
    });
});