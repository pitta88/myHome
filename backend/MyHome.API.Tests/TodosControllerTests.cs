using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyHome.API.Controllers;
using MyHome.API.DTOs;
using MyHome.API.Models;

namespace MyHome.API.Tests;

public class TodosControllerTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly User _owner;
    private readonly User _stranger;
    private readonly TodosController _controller;

    public TodosControllerTests()
    {
        _owner = _db.AddUser("owner");
        _stranger = _db.AddUser("stranger");
        _controller = new TodosController(_db.Db).WithUser(_owner.Id);
    }

    public void Dispose() => _db.Dispose();

    /// <summary>A controller acting as the other user, to prove ownership is enforced.</summary>
    private TodosController AsStranger() => new TodosController(_db.Db).WithUser(_stranger.Id);

    // ---------- ownership ----------

    [Fact]
    public async Task GetAll_ReturnsOnlyTheCallersTodos()
    {
        _db.AddTodo(_owner.Id, "mine");
        _db.AddTodo(_stranger.Id, "theirs");

        var result = await _controller.GetAll();

        var todo = Assert.Single(result.OkValue<List<TodoDto>>());
        Assert.Equal("mine", todo.Title);
    }

    [Fact]
    public async Task Update_AnotherUsersTodo_ReturnsNotFound()
    {
        var theirs = _db.AddTodo(_stranger.Id, "theirs");

        var result = await _controller.Update(theirs.Id, new UpdateTodoRequest(1, "hijacked", null, null));

        Assert.IsType<NotFoundResult>(result);

        await using var verify = _db.NewContext();
        Assert.Equal("theirs", (await verify.Todos.SingleAsync(t => t.Id == theirs.Id)).Title);
    }

    [Fact]
    public async Task Toggle_AnotherUsersTodo_ReturnsNotFound()
    {
        var theirs = _db.AddTodo(_stranger.Id, "theirs");

        var result = await _controller.Toggle(theirs.Id);

        Assert.IsType<NotFoundResult>(result);

        await using var verify = _db.NewContext();
        Assert.False((await verify.Todos.SingleAsync(t => t.Id == theirs.Id)).IsCompleted);
    }

    [Fact]
    public async Task Delete_AnotherUsersTodo_ReturnsNotFoundAndKeepsTheRow()
    {
        var theirs = _db.AddTodo(_stranger.Id, "theirs");

        var result = await _controller.Delete(theirs.Id);

        Assert.IsType<NotFoundResult>(result);

        await using var verify = _db.NewContext();
        Assert.True(await verify.Todos.AnyAsync(t => t.Id == theirs.Id));
    }

    // ---------- create / update / toggle ----------

    [Fact]
    public async Task Create_AssignsCallerAsOwner()
    {
        var result = await _controller.Create(new CreateTodoRequest(2, "Rotate tires", "front to back", null));

        var dto = result.OkValue<TodoDto>();
        Assert.Equal("Rotate tires", dto.Title);
        Assert.Equal("자동차", dto.CategoryName);
        Assert.False(dto.IsCompleted);

        await using var verify = _db.NewContext();
        Assert.Equal(_owner.Id, (await verify.Todos.SingleAsync(t => t.Id == dto.Id)).UserId);
    }

    [Fact]
    public async Task Update_ChangesFieldsAndReloadsCategory()
    {
        var todo = _db.AddTodo(_owner.Id, "old", categoryId: 1);
        var due = DateTime.UtcNow.Date.AddDays(3);

        var result = await _controller.Update(todo.Id, new UpdateTodoRequest(3, "new", "desc", due));

        var dto = result.OkValue<TodoDto>();
        Assert.Equal("new", dto.Title);
        Assert.Equal("desc", dto.Description);
        Assert.Equal(due, dto.DueDate);
        Assert.Equal(3, dto.CategoryId);
        Assert.Equal("집 내부", dto.CategoryName);
    }

    [Fact]
    public async Task Toggle_MarksCompleteThenIncompleteAndManagesCompletedAt()
    {
        var todo = _db.AddTodo(_owner.Id);

        var completed = (await _controller.Toggle(todo.Id)).OkValue<TodoDto>();
        Assert.True(completed.IsCompleted);
        Assert.NotNull(completed.CompletedAt);

        var reopened = (await _controller.Toggle(todo.Id)).OkValue<TodoDto>();
        Assert.False(reopened.IsCompleted);
        Assert.Null(reopened.CompletedAt);

        await using var verify = _db.NewContext();
        Assert.Null((await verify.Todos.SingleAsync(t => t.Id == todo.Id)).CompletedAt);
    }

    [Fact]
    public async Task Delete_RemovesOwnTodo()
    {
        var todo = _db.AddTodo(_owner.Id);

        Assert.IsType<NoContentResult>(await _controller.Delete(todo.Id));

        await using var verify = _db.NewContext();
        Assert.False(await verify.Todos.AnyAsync(t => t.Id == todo.Id));
    }

    // ---------- ordering ----------

    [Fact]
    public async Task GetAll_SortsIncompleteFirst_ThenByDueDate_WithUndatedLast()
    {
        var today = DateTime.UtcNow.Date;
        _db.AddTodo(_owner.Id, "done", dueDate: today.AddDays(-1), isCompleted: true);
        _db.AddTodo(_owner.Id, "no due date");
        _db.AddTodo(_owner.Id, "due later", dueDate: today.AddDays(5));
        _db.AddTodo(_owner.Id, "due sooner", dueDate: today.AddDays(1));

        var result = await _controller.GetAll();

        var titles = result.OkValue<List<TodoDto>>().Select(t => t.Title).ToList();
        Assert.Equal(new[] { "due sooner", "due later", "no due date", "done" }, titles);
    }

    [Fact]
    public async Task GetAll_WithNoTodos_ReturnsEmptyList()
    {
        var result = await _controller.GetAll();

        Assert.Empty(result.OkValue<List<TodoDto>>());
    }
}
