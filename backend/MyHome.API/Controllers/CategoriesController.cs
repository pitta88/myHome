using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyHome.API.Data;
using MyHome.API.DTOs;
using MyHome.API.Models;

namespace MyHome.API.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CategoriesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _db.Categories
            .Select(c => new CategoryDto(c.Id, c.Name, c.Icon, c.Color))
            .ToListAsync();
        return Ok(categories);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req)
    {
        var category = new Category
        {
            Name = req.Name,
            Icon = req.Icon,
            Color = req.Color
        };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new CategoryDto(category.Id, category.Name, category.Icon, category.Color));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _db.Categories.FindAsync(id);
        if (category == null) return NotFound();
        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
