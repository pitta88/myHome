namespace MyHome.API.DTOs;

public record CategoryDto(int Id, string Name, string Icon, string Color);
public record CreateCategoryRequest(string Name, string Icon, string Color);
