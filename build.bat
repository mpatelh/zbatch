@echo off
PowerShell -ExecutionPolicy RemoteSigned -Command "Compress-Archive -Path addon\* -CompressionLevel Optimal -DestinationPath zbatch@www.mineshp.com.xpi -Force"