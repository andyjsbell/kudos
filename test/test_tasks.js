const Tasks = artifacts.require("./Tasks.sol");
const KudosToken = artifacts.require("./KudosToken.sol");
const truffleAssert = require('truffle-assertions');
const { toBN, stringToHex, toWei } = web3.utils;

contract("Tasks", async accounts => {

    let [owner, taskOwner, taskHunter, taskHunter1] = accounts; 
    let kudosTokenInstance;
    let tasksInstance;
    let taskOwnerBalance, taskHunterBalance, taskHunter1Balance;
    const initialTokenBalance = 100;
    const tokensForTask = 50;

    before("prepare some things", async function() {
        
        kudosTokenInstance = await KudosToken.deployed();
        tasksInstance = await Tasks.deployed();

        await kudosTokenInstance.transfer(taskOwner, initialTokenBalance, {from: owner});
        await kudosTokenInstance.transfer(taskHunter, initialTokenBalance, {from: owner});
        await kudosTokenInstance.transfer(taskHunter1, initialTokenBalance, {from: owner});
        
        taskOwnerBalance = await kudosTokenInstance.balanceOf(taskOwner);
        taskHunterBalance = await kudosTokenInstance.balanceOf(taskHunter);
        taskHunter1Balance = await kudosTokenInstance.balanceOf(taskHunter1);

        assert.strictEqual(parseInt(taskOwnerBalance.toString()), initialTokenBalance);
        assert.strictEqual(parseInt(taskHunterBalance.toString()), initialTokenBalance);
        assert.strictEqual(parseInt(taskHunter1Balance.toString()), initialTokenBalance);
    });

    it("should fail to create a task with invalid id", async function() {
        
        let fn = tasksInstance.createTask('0x0', initialTokenBalance, {from: taskOwner});
        
        await truffleAssert.reverts(    fn, 
                                        'Invalid id');
    });
  
    it("should not be able to create a task without allowance set", async function() {
        let fn = tasksInstance.createTask('0x1', initialTokenBalance, {from: taskOwner});
        
        await truffleAssert.reverts(    fn, 
                                        'Insufficient allowance');
    });

    it("should be able to create a task with allowance set", async function() {

        // Approve from task owner tokens to be spent on their behalf, allowance has to be higher than that request
        let txObj = await kudosTokenInstance.approve(tasksInstance.address, tokensForTask + 1, {from:taskOwner});

        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logApproval = txObj.logs[0];
        assert.strictEqual(logApproval.event, "Approval");

        // Create task
        txObj = await tasksInstance.createTask('0x1', tokensForTask, {from: taskOwner});

        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logTaskCreated = txObj.logs[0];
        assert.strictEqual(logTaskCreated.event, "TaskCreated");
    });
    
});