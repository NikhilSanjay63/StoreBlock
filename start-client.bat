@echo off
cd /d %~dp0
start cmd /k "npx hardhat run scripts/deploy.js --network localhost && cd client && npm start"
