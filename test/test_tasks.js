const Tasks = artifacts.require("./Tasks.sol");
const KudosToken = artifacts.require("./KudosToken.sol");
const truffleAssert = require('truffle-assertions');
const { toBN, /*stringToHex, toWei,*/ keccak256 } = web3.utils;

const timeTravel = function (time) {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time], // 86400 is num seconds in day
        id: new Date().getTime()
      }, (err, result) => {
        if(err){ return reject(err) }
        return resolve(result)
      });
    })
}

contract("Tasks", async accounts => {

    let [owner, taskOwner, taskHunter, taskHunter1] = accounts; 
    let kudosTokenInstance;
    let tasksInstance;
    let taskOwnerBalance, taskHunterBalance, taskHunter1Balance;
    const initialTokenBalance = 1000;
    const tokensForTask = 50;
    const task1 = keccak256('task1');
    const task2 = keccak256('task2');
    const task3 = keccak256('task3');
    const task4 = keccak256('task4');
    let timeoutInDays = 0;
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

    it("should be able to read timeout in days", async function() {
        const timeout = await tasksInstance.timeoutInDays.call();
        timeoutInDays = parseInt(timeout.toString());
        assert.isTrue(timeoutInDays > 0);
    });

    it("should not be able to set a timeout greater than 60 days", async function() {

        await truffleAssert.reverts(tasksInstance.setTimeoutInDays(61), 
                                    'More than 60 days');
    });

    it("should be able to set timeout in days", async function() {
        const newTimeoutInDays = 14; 
        let txObj = await tasksInstance.setTimeoutInDays(newTimeoutInDays, {from:owner});
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logTimeoutChanged = txObj.logs[0];
        assert.strictEqual(logTimeoutChanged.event, "TimeoutChanged");
        assert.strictEqual(parseInt(logTimeoutChanged.args.beforeInDays.toString()), timeoutInDays);
        assert.strictEqual(parseInt(logTimeoutChanged.args.afterInDays.toString()), newTimeoutInDays);
        
        timeoutInDays = await tasksInstance.timeoutInDays.call();
        assert.isTrue(parseInt(timeoutInDays.toString()) == newTimeoutInDays);
    });

    it("should fail to create a task with invalid id", async function() {
        
        let fn = tasksInstance.createTask(invalidTaskId, tokensForTask, {from: taskOwner});
        
        await truffleAssert.reverts(    fn, 
                                        'Invalid id');
    });
  
    it("should not be able to create a task without tokens sent", async function() {
        let fn = tasksInstance.createTask(task1, 0, {from: taskOwner});
        
        await truffleAssert.reverts(    fn, 
                                        'Send tokens');
    });

    it("should not be able to create a task without allowance set", async function() {
        let fn = tasksInstance.createTask(task1, tokensForTask, {from: taskOwner});
        
        await truffleAssert.reverts(    fn, 
                                        'Insufficient allowance');
    });

    it("should be able to create a task with allowance set and tokens staked", async function() {

        // Approve from task owner tokens to be spent on their behalf, allowance has to be higher than that request
        let txObj = await kudosTokenInstance.approve(tasksInstance.address, initialTokenBalance, {from:taskOwner});

        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logApproval = txObj.logs[0];
        assert.strictEqual(logApproval.event, "Approval");

        let balanceBeforeOfTaskOwnerBN = await kudosTokenInstance.balanceOf(taskOwner);
        let balanceBeforeOfTasksContractBN = await kudosTokenInstance.balanceOf(tasksInstance.address);
        // Create task
        txObj = await tasksInstance.createTask(task1, tokensForTask, {from: taskOwner});

        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logTaskCreated = txObj.logs[0];
        assert.strictEqual(logTaskCreated.event, "TaskCreated");
        assert.strictEqual(logTaskCreated.args.task, task1);
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

        // Create task
        let fn = tasksInstance.createTask(task1, tokensForTask, {from: taskOwner});;

        await truffleAssert.reverts(    fn, 
                                        'Task exists');
    });


    it("should not be able to complete a task when there is no hunter", async function() {

        // Complete task
        let fn = tasksInstance.completeTask(task1, taskHunter, {from: taskOwner});

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
        let fn = tasksInstance.addHunter(task2, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Task does not exist');
    });

    it("should be able to add a hunter to a task that does exist", async function() {

        // Add hunter
        let txObj = await tasksInstance.addHunter(task1, {from: taskHunter});
        
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logHunterAdded = txObj.logs[0];
        assert.strictEqual(logHunterAdded.event, "HunterAdded");
        assert.strictEqual(logHunterAdded.args.task, task1);
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
        let fn = tasksInstance.completeTask(task1, taskHunter, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Invalid task');
    });
    
    it("should not be able to complete a task when there is an invalid hunter", async function() {

        // Complete task
        let fn = tasksInstance.completeTask(task1, invalidAddress, {from: taskOwner});

        await truffleAssert.reverts(    fn, 
                                        'Invalid hunter');
    });

    it("should be able to complete a task with valid hunter", async function() {

        let balanceBeforeOfTaskHunterBN = await kudosTokenInstance.balanceOf(taskHunter);
        let balanceBeforeOfTasksContractBN = await kudosTokenInstance.balanceOf(tasksInstance.address);
        // Add hunter
        let txObj = await tasksInstance.completeTask(task1, taskHunter, {from: taskOwner});
        
        let balanceAfterOfTaskHunterBN = await kudosTokenInstance.balanceOf(taskHunter);
        let balanceAfterOfTasksContractBN = await kudosTokenInstance.balanceOf(tasksInstance.address);
        
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logTaskCompleted = txObj.logs[0];
        assert.strictEqual(logTaskCompleted.event, "TaskCompleted");
        assert.strictEqual(logTaskCompleted.args.task, task1);
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

    it("should not be able to complete a task when there are no tokens", async function() {

        // Complete task
        let fn = tasksInstance.completeTask(task1, taskHunter, {from: taskOwner});

        await truffleAssert.reverts(    fn, 
                                        'Task completed');
    });

    it("should not be able to add a hunter when there are no tokens", async function() {

        // Add hunter
        let fn = tasksInstance.addHunter(task1, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Task completed');
    });

    it("should not be able to remove a hunter with an invalid task", async function() {

        // Remove hunter
        let fn = tasksInstance.removeHunter(invalidTaskId, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Invalid id');
    });

    it("should not be able to remove a hunter from a task that does not exist", async function() {

        // Remove hunter
        let fn = tasksInstance.removeHunter(task2, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Task does not exist');
    });

    it("should not be able to remove a hunter from a task when the hunter isn't in the list", async function() {

        // Remove hunter
        let fn = tasksInstance.removeHunter(task1, {from: taskHunter1});

        await truffleAssert.reverts(    fn, 
                                        'Hunter does not exist');
    });

    it("should be able to remove a hunter from a task when the hunter is in the list", async function() {

        // Remove hunter
        let txObj = await tasksInstance.removeHunter(task1, {from: taskHunter});
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logHunterRemoved = txObj.logs[0];
        assert.strictEqual(logHunterRemoved.event, "HunterRemoved");
        assert.strictEqual(logHunterRemoved.args.task, task1);
        assert.strictEqual(logHunterRemoved.args.hunter, taskHunter);
    });

    it("should not be able to cancel a task with an invalid id", async function() {

        let fn = tasksInstance.cancelTask(invalidTaskId, {from:taskOwner});
        await truffleAssert.reverts(    fn, 
                                        'Invalid id');
    });

    it("should not be able to cancel a task which does not exist", async function() {

        let fn = tasksInstance.cancelTask(task2, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Invalid task');
    });

    it("should not be able to cancel a task which if you are not the owner", async function() {

        let fn = tasksInstance.cancelTask(task1, {from: taskHunter});

        await truffleAssert.reverts(    fn, 
                                        'Invalid task');
    });

    it("should not be able to cancel a task which has active hunters", async function() {

        await tasksInstance.createTask(task2, tokensForTask, {from:taskOwner});
        await tasksInstance.addHunter(task2, {from: taskHunter});
        
        let fn = tasksInstance.cancelTask(task2, {from: taskOwner});

        await truffleAssert.reverts(    fn, 
                                        'Unable as still valid');
    });

    it("should be able to cancel a task with no hunters", async function() {

        await tasksInstance.removeHunter(task2, {from: taskHunter});

        let balanceBeforeOfTaskOwnerBN = await kudosTokenInstance.balanceOf(taskOwner);
        let balanceBeforeOfTasksContractBN = await kudosTokenInstance.balanceOf(tasksInstance.address);
        
        let txObj = await tasksInstance.cancelTask(task2, {from: taskOwner});

        let balanceAfterOfTaskOwnerBN = await kudosTokenInstance.balanceOf(taskOwner);
        let balanceAfterOfTasksContractBN = await kudosTokenInstance.balanceOf(tasksInstance.address);
        
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logTaskCancelled = txObj.logs[0];
        assert.strictEqual(logTaskCancelled.event, "TaskCancelled");
        assert.strictEqual(logTaskCancelled.args.task, task2);
        assert.strictEqual(logTaskCancelled.args.owner, taskOwner);

        // Owner should get stake back
        let diffTaskOwnerBN = balanceAfterOfTaskOwnerBN.sub(balanceBeforeOfTaskOwnerBN);
        // Contract should pay back stake
        let diffTaskContractBN = balanceBeforeOfTasksContractBN.sub(balanceAfterOfTasksContractBN);
        
        assert.strictEqual(diffTaskOwnerBN.toString(), toBN(tokensForTask).toString());
        assert.strictEqual(diffTaskContractBN.toString(), toBN(tokensForTask).toString());
    });

    it("should be able to cancel a task which has reached its timeout", async function() {

        let txObj = await tasksInstance.createTask(task3, tokensForTask, {from: taskOwner});
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logTaskCreated = txObj.logs[0];
        assert.strictEqual(logTaskCreated.event, "TaskCreated");
        assert.strictEqual(logTaskCreated.args.task, task3);
        assert.strictEqual(logTaskCreated.args.owner, taskOwner);

        // Jump forward a week
        await timeTravel(86400 * timeoutInDays); 
        txObj = await tasksInstance.cancelTask(task3, {from: taskOwner});
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logTaskCancelled = txObj.logs[0];
        assert.strictEqual(logTaskCancelled.event, "TaskCancelled");
        assert.strictEqual(logTaskCancelled.args.task, task3);
        assert.strictEqual(logTaskCancelled.args.owner, taskOwner);
    });

    it("should not be able to create task when paused", async function() {

        let txObj = await tasksInstance.pause({from: owner});
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logPaused = txObj.logs[0];
        assert.strictEqual(logPaused.event, "Paused");

        await truffleAssert.reverts(tasksInstance.createTask(task3, tokensForTask, {from: taskOwner}), 
                                    'Pausable: paused');
    });

    it("should not be able to add a hunter task when paused", async function() {

        await truffleAssert.reverts(tasksInstance.addHunter(task3, {from: taskOwner}), 
                                    'Pausable: paused');
    });

    it("should not be able to complete task when paused", async function() {

        await truffleAssert.reverts(tasksInstance.completeTask(task3, taskHunter, {from: taskOwner}), 
                                    'Pausable: paused');
    });

    it("should be able to get a list of all created tasks", async function() {
        let events = await tasksInstance.getPastEvents('TaskCreated', {fromBlock:0, toBlock:'latest'});
        assert.isTrue(events.length > 0);
    });

    it("should be able to get a list of all completed tasks", async function() {
        let events = await tasksInstance.getPastEvents('TaskCompleted', {fromBlock:0, toBlock:'latest'});
        assert.isTrue(events.length > 0);
    });

    it("should be able to get a list of all my created tasks", async function() {
        let events = await tasksInstance.getPastEvents('TaskCreated', {fromBlock:0, toBlock:'latest', filter:{owner:taskOwner}});        
        assert.isTrue(events.length > 0);
    });

    it("should be able to get a list of all my completed tasks", async function() {
        let events = await tasksInstance.getPastEvents('TaskCompleted', {fromBlock:0, toBlock:'latest', filter:{owner:taskOwner}});        
        assert.isTrue(events.length > 0);
    });

    it("should be able as a hunter to see the tasks I am hunting", async function() {
        let events = await tasksInstance.getPastEvents('HunterAdded', {fromBlock:0, toBlock:'latest', filter:{hunter:taskHunter}});        
        assert.isTrue(events.length > 0);
    });
});