namespace MyHome.API.DTOs;

public class TodoDto
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryIcon { get; set; } = string.Empty;
    public string CategoryColor { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public record CreateTodoRequest(
    int CategoryId,
    string Title,
    string? Description,
    DateTime? DueDate
);

public record UpdateTodoRequest(
    int CategoryId,
    string Title,
    string? Description,
    DateTime? DueDate
);
