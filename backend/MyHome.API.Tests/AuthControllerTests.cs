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

    // ---------- 비밀번호 변경 ----------

    private const string NewPassword = "a-much-longer-passphrase";

    [Fact]
    public async Task ChangePassword_ReplacesTheStoredHash()
    {
        var user = _db.AddUser("admin", "admin1234");
        _controller.WithUser(user.Id);

        var result = await _controller.ChangePassword(new ChangePasswordRequest("admin1234", NewPassword));

        Assert.Equal("admin", result.OkValue<AuthResponse>().Username);

        await using var verify = _db.NewContext();
        var stored = await verify.Users.SingleAsync(u => u.Id == user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify(NewPassword, stored.PasswordHash));
        Assert.False(BCrypt.Net.BCrypt.Verify("admin1234", stored.PasswordHash));
    }

    [Fact]
    public async Task ChangePassword_ThenOldPasswordNoLongerLogsIn()
    {
        var user = _db.AddUser("admin", "admin1234");
        _controller.WithUser(user.Id);

        await _controller.ChangePassword(new ChangePasswordRequest("admin1234", NewPassword));

        Assert.IsType<UnauthorizedObjectResult>(await _controller.Login(new LoginRequest("admin", "admin1234")));
        Assert.Equal("admin", (await _controller.Login(new LoginRequest("admin", NewPassword)))
            .OkValue<AuthResponse>().Username);
    }

    [Fact]
    public async Task ChangePassword_WithWrongCurrentPassword_IsRejected()
    {
        var user = _db.AddUser("admin", "admin1234");
        _controller.WithUser(user.Id);

        var result = await _controller.ChangePassword(new ChangePasswordRequest("not-my-password", NewPassword));

        Assert.IsType<BadRequestObjectResult>(result);

        await using var verify = _db.NewContext();
        var stored = await verify.Users.SingleAsync(u => u.Id == user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("admin1234", stored.PasswordHash));   // 그대로여야 한다
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("short")]
    [InlineData("123456789")]   // 9자 — 경계 바로 아래
    public async Task ChangePassword_WithTooShortPassword_IsRejected(string tooShort)
    {
        var user = _db.AddUser("admin", "admin1234");
        _controller.WithUser(user.Id);

        var result = await _controller.ChangePassword(new ChangePasswordRequest("admin1234", tooShort));

        Assert.IsType<BadRequestObjectResult>(result);

        await using var verify = _db.NewContext();
        Assert.True(BCrypt.Net.BCrypt.Verify("admin1234",
            (await verify.Users.SingleAsync(u => u.Id == user.Id)).PasswordHash));
    }

    [Fact]
    public async Task ChangePassword_AcceptsExactlyTenCharacters()
    {
        var user = _db.AddUser("admin", "admin1234");
        _controller.WithUser(user.Id);

        var result = await _controller.ChangePassword(new ChangePasswordRequest("admin1234", "1234567890"));

        Assert.IsType<OkObjectResult>(result);   // 경계값 10자는 통과해야 한다
    }

    [Fact]
    public async Task ChangePassword_RejectsReusingTheSamePassword()
    {
        var user = _db.AddUser("admin", "admin1234-long-enough");
        _controller.WithUser(user.Id);

        var result = await _controller.ChangePassword(
            new ChangePasswordRequest("admin1234-long-enough", "admin1234-long-enough"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ChangePassword_OnlyAffectsTheCallersOwnAccount()
    {
        var admin = _db.AddUser("admin", "admin1234");
        var other = _db.AddUser("other", "other1234");
        _controller.WithUser(admin.Id);

        await _controller.ChangePassword(new ChangePasswordRequest("admin1234", NewPassword));

        await using var verify = _db.NewContext();
        var untouched = await verify.Users.SingleAsync(u => u.Id == other.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("other1234", untouched.PasswordHash));
    }

    [Fact]
    public async Task ChangePassword_ReturnsAWorkingToken()
    {
        var user = _db.AddUser("admin", "admin1234");
        _controller.WithUser(user.Id);

        var result = await _controller.ChangePassword(new ChangePasswordRequest("admin1234", NewPassword));

        var token = new JwtSecurityTokenHandler().ReadJwtToken(result.OkValue<AuthResponse>().Token);
        Assert.Equal(user.Id.ToString(), token.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);
    }
}
