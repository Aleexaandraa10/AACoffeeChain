import "@nomicfoundation/hardhat-toolbox-viem";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    viem: any;
  }
}