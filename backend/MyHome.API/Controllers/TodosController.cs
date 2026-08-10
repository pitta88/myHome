using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyHome.API.Data;
using MyHome.API.DTOs;
using MyHome.API.Models;
using System.Security.Claims;

namespace MyHome.API.Controllers;

[ApiController]
[Route("api/todos")]
[Authorize]
public class TodosController : ControllerBase
{
    private readonly AppDbContext _db;

    public TodosController(AppDbContext db)
    {
        _db = db;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static TodoDto MapToDto(Todo t) => new()
    {
        Id = t.Id,
        CategoryId = t.CategoryId,
        CategoryName = t.Category.Name,
        CategoryIcon = t.Category.Icon,
        CategoryColor = t.Category.Color,
        Title = t.Title,
        Description = t.Description,
        DueDate = t.DueDate,
        IsCompleted = t.IsCompleted,
        CompletedAt = t.CompletedAt,
        CreatedAt = t.CreatedAt
    };

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        var todos = await _db.Todos
            .Include(t => t.Category)
            .Where(t => t.UserId == userId)
            .OrderBy(t => t.IsCompleted)
            .ThenBy(t => t.DueDate == null)
            .ThenBy(t => t.DueDate)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => MapToDto(t))
            .ToListAsync();
        return Ok(todos);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTodoRequest req)
    {
        var todo = new Todo
        {
            UserId = GetUserId(),
            CategoryId = req.CategoryId,
            Title = req.Title,
            Description = req.Description,
            DueDate = req.DueDate
        };
        _db.Todos.Add(todo);
        await _db.SaveChangesAsync();
        await _db.Entry(todo).Reference(t => t.Category).LoadAsync();
        return Ok(MapToDto(todo));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTodoRequest req)
    {
        var todo = await _db.Todos.Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == GetUserId());
        if (todo == null) return NotFound();

        todo.CategoryId = req.CategoryId;
        todo.Title = req.Title;
        todo.Description = req.Description;
        todo.DueDate = req.DueDate;
        await _db.SaveChangesAsync();
        await _db.Entry(todo).Reference(t => t.Category).LoadAsync();
        return Ok(MapToDto(todo));
    }

    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> Toggle(int id)
    {
        var todo = await _db.Todos.Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == GetUserId());
        if (todo == null) return NotFound();

        todo.IsCompleted = !todo.IsCompleted;
        todo.CompletedAt = todo.IsCompleted ? DateTime.UtcNow : null;
        await _db.SaveChangesAsync();
        return Ok(MapToDto(todo));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var todo = await _db.Todos
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == GetUserId());
        if (todo == null) return NotFound();

        _db.Todos.Remove(todo);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
