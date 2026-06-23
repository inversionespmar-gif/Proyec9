using System;
using System.Collections.Generic;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Controller.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.ScraperBridge;

public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public override string Name => "Scraper Bridge";
    public override Guid Id => Guid.Parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    public override string Description => "Virtual library from scraped streaming content";

    public Plugin(IApplicationPaths appPaths, IXmlSerializer xmlSerializer)
        : base(appPaths, xmlSerializer) { }

    public IEnumerable<PluginPageInfo> GetPages() => Array.Empty<PluginPageInfo>();
}

public class ServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection)
    {
        serviceCollection.AddSingleton<ScraperApiClient>(sp =>
        {
            var config = sp.GetRequiredService<PluginConfiguration>();
            var http = new System.Net.Http.HttpClient { BaseAddress = new Uri(config.ScraperApiUrl) };
            return new ScraperApiClient(http, config.ApiKey);
        });
        serviceCollection.AddSingleton<ScraperItemProvider>(sp =>
        {
            var client = sp.GetRequiredService<ScraperApiClient>();
            var logger = sp.GetRequiredService<ILogger<ScraperItemProvider>>();
            var config = sp.GetRequiredService<PluginConfiguration>();
            return new ScraperItemProvider(client, logger, config.CacheDurationMinutes);
        });
        serviceCollection.AddSingleton<ScraperStreamProvider>(sp =>
        {
            var client = sp.GetRequiredService<ScraperApiClient>();
            var logger = sp.GetRequiredService<ILogger<ScraperStreamProvider>>();
            return new ScraperStreamProvider(client, logger);
        });
    }
}
