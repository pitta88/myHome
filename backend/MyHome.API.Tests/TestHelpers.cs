using System.Security.Claims;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;

namespace MyHome.API.Tests;

public static class TestHelpers
{
    /// <summary>Matches the Jwt section shape the controllers read from appsettings.</summary>
    public static IConfiguration Config(
        string key = "TestSigningKeyThatIsLongEnough1234567890",
        string issuer = "MyHome.API",
        string audience = "MyHome.Client") =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = key,
                ["Jwt:Issuer"] = issuer,
                ["Jwt:Audience"] = audience
            })
            .Build();

    /// <summary>Attaches an authenticated user so controllers reading claims work.</summary>
    public static T WithUser<T>(this T controller, int userId, string username = "tester")
        where T : ControllerBase
    {
        var identity = new ClaimsIdentity(
            new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Name, username)
            },
            authenticationType: "TestAuth");

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return controller;
    }

    // ---------- unwrapping IActionResult ----------

    public static T OkValue<T>(this IActionResult result)
    {
        var ok = Assert.IsType<OkObjectResult>(result);
        return Assert.IsAssignableFrom<T>(ok.Value!);
    }

    public static T CreatedValue<T>(this IActionResult result)
    {
        var created = Assert.IsType<CreatedAtActionResult>(result);
        return Assert.IsAssignableFrom<T>(created.Value!);
    }
}

/// <summary>
/// Stand-in for IWebHostEnvironment. LogsController writes uploads under WebRootPath,
/// so each instance gets its own throwaway directory.
/// </summary>
public sealed class TempWebHostEnvironment : IWebHostEnvironment, IDisposable
{
    public TempWebHostEnvironment()
    {
        WebRootPath = Path.Combine(Path.GetTempPath(), "myhome-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(WebRootPath);
        ContentRootPath = WebRootPath;
        WebRootFileProvider = new PhysicalFileProvider(WebRootPath);
        ContentRootFileProvider = WebRootFileProvider;
    }

    public string WebRootPath { get; set; }
    public IFileProvider WebRootFileProvider { get; set; }
    public string ContentRootPath { get; set; }
    public IFileProvider ContentRootFileProvider { get; set; }
    public string ApplicationName { get; set; } = "MyHome.API.Tests";
    public string EnvironmentName { get; set; } = "Test";

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(WebRootPath)) Directory.Delete(WebRootPath, recursive: true);
        }
        catch (IOException)
        {
            // A leftover temp directory must not fail a test run.
        }
    }
}
