using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.ScraperBridge;

public class PluginConfiguration : BasePluginConfiguration
{
    public string ScraperApiUrl { get; set; } = "http://localhost:3000";
    public string ApiKey { get; set; } = string.Empty;
    public int CacheDurationMinutes { get; set; } = 60;
}
