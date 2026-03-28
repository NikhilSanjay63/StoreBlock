@echo off
cd /d %~dp0

:: Start Hardhat node in a new terminal
start cmd /k "npx hardhat compile && npx hardhat node"

:: Give it a few seconds to start the local node
timeout /t 5 /nobreak >nul

:: Start deploy + frontend in a new terminal
start cmd /k "npx hardhat run scripts/deploy.js --network localhost && cd client && npm start"
