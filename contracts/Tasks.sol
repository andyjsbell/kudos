pragma solidity ^0.5.0;
import './KudosToken.sol';

contract Tasks {

    struct Task {
        address owner;
        uint tokens;
        address[] hunters;
    }

    event TaskCreated(address indexed creator, uint indexed tokens);
    mapping(bytes32 => Task) public tasks;

    KudosToken private kudos;

    constructor(KudosToken _kudos) public {
        kudos = _kudos;
    }

    function createTask(bytes32 _id, uint32 _tokens)
        public
        returns (bool) {
        require(_id[0] != 0, 'Invalid id');
        require(tasks[_id].owner == address(0x0), 'Task exists');
        require(kudos.allowance(msg.sender, address(this)) > _tokens, 'Insufficient allowance');

        // Store on chain
        Task memory t;
        t.owner = msg.sender;
        t.tokens = _tokens;
        tasks[_id] = t;

        // Emit the event
        emit TaskCreated(msg.sender, _tokens);

        // Stake tokens
        return kudos.transferFrom(msg.sender, address(this), _tokens);
    }

    function completeTask(bytes32 _id, address winner)
        public {
        require(tasks[_id].owner == msg.sender, 'Invalid task');
    }
}