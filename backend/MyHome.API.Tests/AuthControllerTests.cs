using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyHome.API.Controllers;
using MyHome.API.DTOs;

namespace MyHome.API.Tests;

public class AuthControllerTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly AuthController _controller;

    public AuthControllerTests() => _controller = new AuthController(_db.Db, TestHelpers.Config());

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Login_WithCorrectPassword_ReturnsTokenAndUsername()
    {
        _db.AddUser("admin", "admin1234");

        var result = await _controller.Login(new LoginRequest("admin", "admin1234"));

        var auth = result.OkValue<AuthResponse>();
        Assert.Equal("admin", auth.Username);
        Assert.NotEmpty(auth.Token);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        _db.AddUser("admin", "admin1234");

        var result = await _controller.Login(new LoginRequest("admin", "wrong"));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_WithUnknownUsername_ReturnsUnauthorized()
    {
        _db.AddUser("admin", "admin1234");

        var result = await _controller.Login(new LoginRequest("nobody", "admin1234"));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_IsCaseSensitiveOnPassword()
    {
        _db.AddUser("admin", "admin1234");

        var result = await _controller.Login(new LoginRequest("admin", "ADMIN1234"));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Token_CarriesUserIdAsNameIdentifier()
    {
        // TodosController parses this claim to scope every query, so it has to be the row id.
        var user = _db.AddUser("admin", "admin1234");

        var result = await _controller.Login(new LoginRequest("admin", "admin1234"));

        var token = new JwtSecurityTokenHandler().ReadJwtToken(result.OkValue<AuthResponse>().Token);
        var nameId = token.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value;
        Assert.Equal(user.Id.ToString(), nameId);
    }

    [Fact]
    public async Task Token_UsesConfiguredIssuerAndAudience()
    {
        _db.AddUser("admin", "admin1234");

        var result = await _controller.Login(new LoginRequest("admin", "admin1234"));

        var token = new JwtSecurityTokenHandler().ReadJwtToken(result.OkValue<AuthResponse>().Token);
        Assert.Equal("MyHome.API", token.Issuer);
        Assert.Contains("MyHome.Client", token.Audiences);
        Assert.True(token.ValidTo > DateTime.UtcNow.AddDays(29));
    }

    [Fact]
    public async Task Register_CreatesUserWithHashedPassword()
    {
        var result = await _controller.Register(new RegisterRequest("newbie", "s3cret"));

        Assert.Equal("newbie", result.OkValue<AuthResponse>().Username);

        await using var verify = _db.NewContext();
        var stored = await verify.Users.SingleAsync(u => u.Username == "newbie");
        Assert.NotEqual("s3cret", stored.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("s3cret", stored.PasswordHash));
    }

    [Fact]
    public async Task Register_WithDuplicateUsername_ReturnsBadRequest()
    {
        _db.AddUser("admin", "admin1234");

        var result = await _controller.Register(new RegisterRequest("admin", "another"));

        Assert.IsType<BadRequestObjectResult>(result);

        await using var verify = _db.NewContext();
        Assert.Equal(1, await verify.Users.CountAsync(u => u.Username == "admin"));
    }

    [Fact]
    public async Task Register_ThenLogin_Succeeds()
    {
        await _controller.Register(new RegisterRequest("newbie", "s3cret"));

        var result = await _controller.Login(new LoginRequest("newbie", "s3cret"));

        Assert.Equal("newbie", result.OkValue<AuthResponse>().Username);
    }
}
