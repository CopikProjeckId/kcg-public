pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FixedSupplyToken is ERC20, Ownable {
    string public metadataURI;

    event MetadataURIUpdated(string oldURI, string newURI);

    address public immutable deployer;

    constructor(
        string memory _name,
        string memory _symbol,
        address _initialOwner,
        string memory _initialURI,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) Ownable(_initialOwner) {
        require(_initialOwner != address(0), "Owner cannot be zero");

        deployer = msg.sender;
        metadataURI = _initialURI;

        if (_initialSupply > 0) {
            _mint(_initialOwner, _initialSupply);
        }
    }

    function setMetadataURI(string calldata newURI) external onlyOwner {
        string memory old = metadataURI;
        metadataURI = newURI;
        emit MetadataURIUpdated(old, newURI);
    }

    function changeAdmin(address newAdmin) public onlyOwner {
        require(newAdmin != address(0), "New admin is zero");
        transferOwnership(newAdmin);
    }

    function transferOwnershipAtLaunch(address newOwner) external onlyOwner {
        changeAdmin(newOwner);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "Burn amount exceeds allowance");
        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
    }
}
