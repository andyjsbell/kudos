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
        await userRoleInstance.updateUser(hash1, {from:user1});
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
        await userRoleInstance.removeUser(user1, {from:owner});
        const chainHash = await userRoleInstance.users.call(user1);
        assert.strictEqual(chainHash[0], '0');
    });

    it('should fail removing user if not owner', async function() {
        await truffleAssert.reverts(userRoleInstance.removeUser(user1, {from:user1}), 
                                    'Ownable: caller is not the owner');
    });
});