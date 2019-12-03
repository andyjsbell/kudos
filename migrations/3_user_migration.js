const UserRole = artifacts.require("UserRole");

module.exports = async function(deployer) {

  await deployer.deploy(UserRole);
};
