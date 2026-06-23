using System;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Media;
using MediaBrowser.Model.Dto;
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

    public async Task<MediaSourceInfo?> GetMediaSource(string mediaSourceId, string? liveStreamId, CancellationToken ct)
    {
        var details = await _apiClient.FetchItemDetailsAsync(mediaSourceId);
        if (details is null || details.Streams.Count == 0) return null;

        var bestStream = details.Streams[0];
        return new MediaSourceInfo
        {
            Id = mediaSourceId,
            Name = details.Title,
            MediaSourceType = MediaSourceType.Placeholder,
            MediaStreams = new System.Collections.Generic.List<MediaStream>
            {
                new() { Type = MediaStreamType.Video, IsExternal = true, ExternalUrl = bestStream.Url }
            },
            LocationType = MediaLocationType.Remote,
            Path = bestStream.Url,
            IsRemote = true,
            SupportsTranscoding = true,
        };
    }
}
