namespace MyHome.API.DTOs;

public record LoginRequest(string Username, string Password);
public record RegisterRequest(string Username, string Password);
public record AuthResponse(string Token, string Username);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
