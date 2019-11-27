const Tasks = artifacts.require("./Tasks.sol");
const KudosToken = artifacts.require("./KudosToken.sol");
const truffleAssert = require('truffle-assertions');
const { toBN, stringToHex, toWei, keccak256 } = web3.utils;

contract("Tasks", async accounts => {

    let [owner, taskOwner, taskHunter, taskHunter1] = accounts; 
    let kudosTokenInstance;
    let tasksInstance;
    let taskOwnerBalance, taskHunterBalance, taskHunter1Balance;
    const initialTokenBalance = 100;
    const tokensForTask = 50;
    const taskId = keccak256('task1');
    const anotherTaskId = keccak256('task2');
    const invalidTaskId = '0x0000000000000000000000000000000000000000';
    const invalidAddress = '0x0000000000000000000000000000000000000000';

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
        
        let fn = tasksInstance.createTask(invalidTaskId, initialTokenBalance, {from: taskOwner});
        
        await truffleAssert.reverts(    fn, 
                                        'Invalid id');
    });
  
    it("should not be able to create a task without tokens sent", async function() {
        let fn = tasksInstance.createTask(taskId, 0, {from: taskOwner});
        
        await truffleAssert.reverts(    fn, 
                                        'Send tokens');
    });

    it("should not be able to create a task without allowance set", async function() {
        let fn = tasksInstance.createTask(taskId, initialTokenBalance, {from: taskOwner});
        
        await truffleAssert.reverts(    fn, 
                                        'Insufficient allowance');
    });

    it("should be able to create a task with allowance set and tokens staked", async function() {

        // Approve from task owner tokens to be spent on their behalf, allowance has to be higher than that request
        let txObj = await kudosTokenInstance.approve(tasksInstance.address, tokensForTask + 1, {from:taskOwner});

        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logApproval = txObj.logs[0];
        assert.strictEqual(logApproval.event, "Approval");

        let balanceBeforeOfTaskOwnerBN = await kudosTokenInstance.balanceOf(taskOwner);
        let balanceBeforeOfTasksContractBN = await kudosTokenInstance.balanceOf(tasksInstance.address);
        // Create task
        txObj = await tasksInstance.createTask(taskId, tokensForTask, {from: taskOwner});

        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logTaskCreated = txObj.logs[0];
        assert.strictEqual(logTaskCreated.event, "TaskCreated");
        assert.strictEqual(logTaskCreated.args.task, taskId);
        assert.strictEqual(logTaskCreated.args.owner, taskOwner);
        assert.strictEqual(parseInt(logTaskCreated.args.tokens.toString()), tokensForTask);

        let balanceAfterOfTaskOwnerBN = await kudosTokenInstance.balanceOf(taskOwner);
        let balanceAfterOfTasksContractBN = await kudosTokenInstance.balanceOf(tasksInstance.address);
        // Task owner has staked
        let diffTaskOwnerBN = balanceBeforeOfTaskOwnerBN.sub(balanceAfterOfTaskOwnerBN);
        // Contract has received the stake
        let diffTaskContractBN = balanceAfterOfTasksContractBN.sub(balanceBeforeOfTasksContractBN);
        
        assert.strictEqual(diffTaskOwnerBN.toString(), toBN(tokensForTask).toString());
        assert.strictEqual(diffTaskContractBN.toString(), toBN(tokensForTask).toString());
    });
    
    it("should not be able to create a task with the same id twice, ever", async function() {

        // Approve from task owner tokens to be spent on their behalf, allowance has to be higher than that request
        let txObj = await kudosTokenInstance.approve(tasksInstance.address, tokensForTask + 1, {from:taskOwner});

        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logApproval = txObj.logs[0];
        assert.strictEqual(logApproval.event, "Approval");

        // Create task
        let fn = tasksInstance.createTask(taskId, tokensForTask, {from: taskOwner});;

        await truffleAssert.reverts(    fn, 
                                        'Task exists');
    });


    it("should not be able to complete a task when there is no hunter", async function() {

        // Complete task
        let fn = tasksInstance.completeTask(taskId, taskHunter, {from: taskOwner});

        await truffleAssert.reverts(    fn, 
                                        'No hunters');
    });
    
    it("should not be able to add a hunter with an invalid task", async function() {

        // Complete task
        let fn = tasksInstance.addHunter(invalidTaskId, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Invalid id');
    });

    it("should not be able to add a hunter to a task that does not exist", async function() {

        // Complete task
        let fn = tasksInstance.addHunter(anotherTaskId, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Task does not exist');
    });

    it("should be able to add a hunter to a task that does exist", async function() {

        // Add hunter
        let txObj = await tasksInstance.addHunter(taskId, {from: taskHunter});
        
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logHunterAdded = txObj.logs[0];
        assert.strictEqual(logHunterAdded.event, "HunterAdded");
        assert.strictEqual(logHunterAdded.args.task, taskId);
        assert.strictEqual(logHunterAdded.args.hunter, taskHunter);
    });

    it("should not be able to complete a task that doesn't exist", async function() {

        // Complete task
        let fn = tasksInstance.completeTask(invalidTaskId, taskHunter, {from: taskOwner});;

        await truffleAssert.reverts(    fn, 
                                        'Invalid task');
    });

    it("should not be able to complete a task when you are not the task owner", async function() {

        // Complete task
        let fn = tasksInstance.completeTask(taskId, taskHunter, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Invalid task');
    });
    
    it("should not be able to complete a task when there is an invalid hunter", async function() {

        // Complete task
        let fn = tasksInstance.completeTask(taskId, invalidAddress, {from: taskOwner});

        await truffleAssert.reverts(    fn, 
                                        'Invalid hunter');
    });

    it("should be able to complete a task with valid hunter", async function() {

        let balanceBeforeOfTaskHunterBN = await kudosTokenInstance.balanceOf(taskHunter);
        let balanceBeforeOfTasksContractBN = await kudosTokenInstance.balanceOf(tasksInstance.address);
        // Add hunter
        let txObj = await tasksInstance.completeTask(taskId, taskHunter, {from: taskOwner});
        
        let balanceAfterOfTaskHunterBN = await kudosTokenInstance.balanceOf(taskHunter);
        let balanceAfterOfTasksContractBN = await kudosTokenInstance.balanceOf(tasksInstance.address);
        
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logTaskCompleted = txObj.logs[0];
        assert.strictEqual(logTaskCompleted.event, "TaskCompleted");
        assert.strictEqual(logTaskCompleted.args.task, taskId);
        assert.strictEqual(logTaskCompleted.args.owner, taskOwner);
        assert.strictEqual(logTaskCompleted.args.hunter, taskHunter);
        assert.strictEqual(parseInt(logTaskCompleted.args.tokensTransferred.toString()), tokensForTask);
        
        // Hunter should earn something
        let diffTaskHunterBN = balanceAfterOfTaskHunterBN.sub(balanceBeforeOfTaskHunterBN);
        // Contract has paid out the tokens
        let diffTaskContractBN = balanceBeforeOfTasksContractBN.sub(balanceAfterOfTasksContractBN);
        
        assert.strictEqual(diffTaskHunterBN.toString(), toBN(tokensForTask).toString());
        assert.strictEqual(diffTaskContractBN.toString(), toBN(tokensForTask).toString());
    });

    it("should not be able to remove a hunter with an invalid task", async function() {

        // Remove hunter
        let fn = tasksInstance.removeHunter(invalidTaskId, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Invalid id');
    });

    it("should not be able to remove a hunter from a task that does not exist", async function() {

        // Remove hunter
        let fn = tasksInstance.removeHunter(anotherTaskId, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Task does not exist');
    });

    it("should not be able to remove a hunter from a task when the hunter isn't in the list", async function() {

        // Remove hunter
        let fn = tasksInstance.removeHunter(taskId, {from: taskHunter1});

        await truffleAssert.reverts(    fn, 
                                        'Hunter does not exist');
    });

    it("should be able to remove a hunter from a task when the hunter is in the list", async function() {

        // Remove hunter
        let txObj = await tasksInstance.removeHunter(taskId, {from: taskHunter});
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logHunterRemoved = txObj.logs[0];
        assert.strictEqual(logHunterRemoved.event, "HunterRemoved");
        assert.strictEqual(logHunterRemoved.args.task, taskId);
        assert.strictEqual(logHunterRemoved.args.hunter, taskHunter);
    });

    it("should not be able to cancel a task with an invalid id", async function() {

        assert(false, "failed");
    });

    it("should not be able to cancel a task which does not exist", async function() {

        assert(false, "failed");
    });

    it("should not be able to cancel a task which if you are not the owner", async function() {

        assert(false, "failed");
    });

    it("should not be able to cancel a task which has active hunters", async function() {

        assert(false, "failed");
    });

    it("should be able to pause a task with hunters to request closure", async function() {

        assert(false, "failed");
    });

    it("should be able to cancel a task with no hunters", async function() {

        assert(false, "failed");
    });

    it("should be able to cancel a task which has reached its timeout", async function() {

        assert(false, "failed");
    });
});