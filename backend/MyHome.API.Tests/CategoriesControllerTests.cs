using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyHome.API.Controllers;
using MyHome.API.DTOs;

namespace MyHome.API.Tests;

public class CategoriesControllerTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly CategoriesController _controller;

    public CategoriesControllerTests() => _controller = new CategoriesController(_db.Db);

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task GetAll_ReturnsTheSeededCategories()
    {
        var result = await _controller.GetAll();

        var categories = result.OkValue<List<CategoryDto>>();
        Assert.Equal(6, categories.Count);
        Assert.Contains(categories, c => c.Name == "잔디/정원" && c.Icon == "🌿" && c.Color == "green");
        Assert.Contains(categories, c => c.Name == "자동차");
        Assert.Contains(categories, c => c.Name == "집 내부");
        Assert.Contains(categories, c => c.Name == "기타");
        Assert.Contains(categories, c => c.Name == "덱스터" && c.Icon == "🐕" && c.Color == "amber");
        Assert.Contains(categories, c => c.Name == "CPAP" && c.Icon == "😴" && c.Color == "purple");
    }

    [Fact]
    public async Task Create_PersistsCategoryAndAssignsId()
    {
        var result = await _controller.Create(new CreateCategoryRequest("지하실", "🧹", "purple"));

        var dto = result.CreatedValue<CategoryDto>();
        Assert.True(dto.Id > 0);
        Assert.Equal("지하실", dto.Name);

        await using var verify = _db.NewContext();
        var stored = await verify.Categories.SingleAsync(c => c.Id == dto.Id);
        Assert.Equal("🧹", stored.Icon);
        Assert.Equal("purple", stored.Color);
    }

    [Fact]
    public async Task Delete_RemovesCategory()
    {
        var created = (await _controller.Create(new CreateCategoryRequest("임시", "📦", "gray")))
            .CreatedValue<CategoryDto>();

        var result = await _controller.Delete(created.Id);

        Assert.IsType<NoContentResult>(result);

        await using var verify = _db.NewContext();
        Assert.False(await verify.Categories.AnyAsync(c => c.Id == created.Id));
    }

    [Fact]
    public async Task Delete_UnknownId_ReturnsNotFound()
    {
        var result = await _controller.Delete(9999);

        Assert.IsType<NotFoundResult>(result);
    }
}
