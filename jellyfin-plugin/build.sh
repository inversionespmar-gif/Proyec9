#!/bin/bash
set -e
cd "$(dirname "$0")"
dotnet build -c Release
mkdir -p ../docker/plugins
cp bin/Release/net8.0/Jellyfin.Plugin.ScraperBridge.dll ../docker/plugins/
echo "Plugin built and copied to docker/plugins/"
