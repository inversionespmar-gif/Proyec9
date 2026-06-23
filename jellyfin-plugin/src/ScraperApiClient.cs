using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;

namespace Jellyfin.Plugin.ScraperBridge;

public class MediaItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Poster { get; set; } = string.Empty;
    public string Overview { get; set; } = string.Empty;
    public List<string> Genres { get; set; } = new();
    public List<string> Cast { get; set; } = new();
}

public class MediaItemDetails : MediaItem
{
    public List<StreamSource> Streams { get; set; } = new();
}

public class StreamSource
{
    public string Url { get; set; } = string.Empty;
    public string Quality { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class LibraryResponse
{
    public List<MediaItem> Items { get; set; } = new();
    public int TotalPages { get; set; }
    public int CurrentPage { get; set; }
}

public class SearchResponse
{
    public List<MediaItem> Items { get; set; } = new();
    public int Total { get; set; }
}

public class ScraperApiClient
{
    private readonly HttpClient _http;
    private readonly string _apiKey;

    public ScraperApiClient(HttpClient http, string apiKey)
    {
        _http = http;
        _apiKey = apiKey;
        _http.DefaultRequestHeaders.Add("x-api-key", _apiKey);
    }

    public async Task<LibraryResponse> FetchLibraryAsync(int page = 1)
    {
        var resp = await _http.GetAsync($"/api/library?page={page}");
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<LibraryResponse>(json) ?? new LibraryResponse();
    }

    public async Task<MediaItemDetails?> FetchItemDetailsAsync(string id)
    {
        var resp = await _http.GetAsync($"/api/item/{id}/details");
        if (resp.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<MediaItemDetails>(json);
    }

    public async Task<SearchResponse> SearchAsync(string query)
    {
        var resp = await _http.GetAsync($"/api/search?q={Uri.EscapeDataString(query)}");
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<SearchResponse>(json) ?? new SearchResponse();
    }
}
