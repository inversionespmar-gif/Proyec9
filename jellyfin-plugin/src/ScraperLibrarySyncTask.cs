using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Library;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.ScraperBridge;

public class ScraperLibrarySyncTask : ILibraryPostScanTask
{
    private readonly ScraperItemProvider _itemProvider;
    private readonly ILibraryManager _libraryManager;
    private readonly ILogger<ScraperLibrarySyncTask> _logger;

    public ScraperLibrarySyncTask(
        ScraperItemProvider itemProvider,
        ILibraryManager libraryManager,
        ILogger<ScraperLibrarySyncTask> logger)
    {
        _itemProvider = itemProvider;
        _libraryManager = libraryManager;
        _logger = logger;
    }

    public async Task Run(IProgress<double> progress, CancellationToken cancellationToken)
    {
        var items = await _itemProvider.GetItemsAsync(cancellationToken);
        _logger.LogInformation("Scraper Bridge synced {Count} items from API", items.Count);
        progress.Report(100);
    }
}