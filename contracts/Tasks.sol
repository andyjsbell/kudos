pragma solidity ^0.5.0;
import './KudosToken.sol';

contract Tasks {

    struct Task {
        address owner;
        uint tokens;
        address[] hunters;
    }

    event TaskCreated(address indexed creator, uint indexed tokens);
    event TaskCompleted(address indexed creator, address indexed hunter, uint indexed tokensTransferred);

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

    function addHunter(bytes32 _id)
        public {
        require(_id[0] != 0, 'Invalid id');
    }
    
    function completeTask(bytes32 _id, address winner)
        public {
        require(tasks[_id].owner == msg.sender, 'Invalid task');
        require(tasks[_id].hunters.length > 0, 'No hunters');
        require(winner != address(0x0), 'Invalid hunter');
 
        uint len = tasks[_id].hunters.length;
        address payee = address(0x0);
        for (uint i = 0; i < len; i++) {
            if (winner == tasks[_id].hunters[i]) {
                payee = winner;
                break;
            }
        }
        require(payee != address(0x0), 'Invalid hunter');
    }
}