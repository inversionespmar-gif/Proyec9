using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Providers;
using MediaBrowser.Model.Entities;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.ScraperBridge;

public class ScraperItemProvider : IItemResolverProvider
{
    private readonly ScraperApiClient _apiClient;
    private readonly ILogger<ScraperItemProvider> _logger;
    private readonly List<MediaItem> _cachedItems = new();
    private DateTime _lastFetch = DateTime.MinValue;
    private readonly TimeSpan _cacheDuration;

    public ScraperItemProvider(ScraperApiClient apiClient, ILogger<ScraperItemProvider> logger, int cacheMinutes)
    {
        _apiClient = apiClient;
        _logger = logger;
        _cacheDuration = TimeSpan.FromMinutes(cacheMinutes);
    }

    public async Task<IEnumerable<BaseItem>> GetItemsAsync(ItemResolveArgs args, CancellationToken ct)
    {
        if ((DateTime.UtcNow - _lastFetch) > _cacheDuration || _cachedItems.Count == 0)
        {
            try
            {
                var response = await _apiClient.FetchLibraryAsync(1);
                _cachedItems.Clear();
                _cachedItems.AddRange(response.Items);
                _lastFetch = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch library from Scraper API");
                return Enumerable.Empty<BaseItem>();
            }
        }

        return _cachedItems.Select(MapToBaseItem);
    }

    private static BaseItem MapToBaseItem(MediaItem item)
    {
        return new Movie
        {
            Name = item.Title,
            OriginalTitle = item.Title,
            Overview = item.Overview,
            ProductionYear = item.Year,
            CommunityRating = 0,
            Genres = item.Genres.ToArray(),
            ProviderIds = new Dictionary<string, string>
            {
                { "ScraperBridge", item.Id }
            },
        };
    }
}
