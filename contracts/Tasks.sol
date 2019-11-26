pragma solidity ^0.5.0;

contract Tasks {

    struct Task {
        address owner;
        uint tokens;
    }

    event TaskCreated(address indexed creator, uint indexed tokens);

    mapping(address => uint) public balances;
    mapping(bytes32 => Task) public tasks;

    constructor() {

    }

    function createTask(bytes32 _id, uint32 _tokens)
        public {
        require(_id != "", 'Invalid id');
        require(_tokens > 0, 'Send tokens');
        require(_tokens >= balances[msg.sender], 'Invalid balance');

        emit TaskCreated(msg.sender, _tokens);
        tasks[_id] = Task({owner:msg.sender, tokens: _tokens});
    }
}