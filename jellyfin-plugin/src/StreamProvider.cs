using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Model.Dto;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.MediaInfo;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.ScraperBridge;

public class ScraperStreamProvider : IMediaSourceProvider
{
    private readonly ScraperApiClient _apiClient;
    private readonly ILogger<ScraperStreamProvider> _logger;

    public ScraperStreamProvider(ScraperApiClient apiClient, ILogger<ScraperStreamProvider> logger)
    {
        _apiClient = apiClient;
        _logger = logger;
    }

    public async Task<IEnumerable<MediaSourceInfo>> GetMediaSources(BaseItem item, CancellationToken cancellationToken)
    {
        var providerId = item.GetProviderId("ScraperBridge");
        if (string.IsNullOrEmpty(providerId))
            return Enumerable.Empty<MediaSourceInfo>();

        var details = await _apiClient.FetchItemDetailsAsync(providerId);
        if (details is null || details.Streams.Count == 0)
            return Enumerable.Empty<MediaSourceInfo>();

        var bestStream = details.Streams[0];
        return new List<MediaSourceInfo>
        {
            new()
            {
                Id = providerId,
                Name = details.Title,
                MediaStreams = new List<MediaStream>
                {
                    new() { Type = MediaStreamType.Video, IsExternal = true, Path = bestStream.Url }
                },
                Path = bestStream.Url,
                IsRemote = true,
                SupportsTranscoding = true,
            }
        };
    }

    public Task<ILiveStream> OpenMediaSource(string openToken, List<ILiveStream> currentLiveStreams, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }
}
