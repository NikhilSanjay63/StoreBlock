@echo off
cd /d %~dp0
npx hardhat compile
start cmd /k "npx hardhat node"
