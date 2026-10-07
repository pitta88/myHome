using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using MyHome.API.Data;
using MyHome.API.Models;

namespace MyHome.API.Tests;

/// <summary>
/// A real SQLite database held in memory. Uses the same provider as production, so
/// foreign keys, NULL handling and ordering behave the way they do at runtime —
/// unlike the EF InMemory provider, which silently accepts invalid relational data.
/// The connection stays open for the lifetime of the instance; closing it drops the DB.
/// </summary>
public sealed class TestDb : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _options;

    public AppDbContext Db { get; }

    public TestDb()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        Db = new AppDbContext(_options);
        // Applies the model including the categories seeded via HasData.
        Db.Database.EnsureCreated();
    }

    /// <summary>
    /// A separate context over the same database. Assertions made through this see what
    /// was actually persisted rather than what the writing context still has tracked.
    /// </summary>
    public AppDbContext NewContext() => new(_options);

    // ---------- fixture helpers ----------

    public User AddUser(string username = "tester", string password = "pw")
    {
        var user = new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            CreatedAt = DateTime.UtcNow
        };
        Db.Users.Add(user);
        Db.SaveChanges();
        return user;
    }

    public MaintenanceItem AddItem(
        string name = "Item",
        int categoryId = 1,
        int? intervalDays = null,
        bool isActive = true)
    {
        var item = new MaintenanceItem
        {
            CategoryId = categoryId,
            Name = name,
            IntervalDays = intervalDays,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };
        Db.MaintenanceItems.Add(item);
        Db.SaveChanges();
        return item;
    }

    public MaintenanceLog AddLog(int itemId, DateTime logDate, decimal? cost = null)
    {
        var log = new MaintenanceLog
        {
            ItemId = itemId,
            LogDate = logDate,
            Cost = cost,
            CreatedAt = DateTime.UtcNow
        };
        Db.MaintenanceLogs.Add(log);
        Db.SaveChanges();
        return log;
    }

    public Todo AddTodo(
        int userId,
        string title = "Todo",
        int categoryId = 1,
        DateTime? dueDate = null,
        bool isCompleted = false)
    {
        var todo = new Todo
        {
            UserId = userId,
            CategoryId = categoryId,
            Title = title,
            DueDate = dueDate,
            IsCompleted = isCompleted,
            CreatedAt = DateTime.UtcNow
        };
        Db.Todos.Add(todo);
        Db.SaveChanges();
        return todo;
    }

    public void Dispose()
    {
        Db.Dispose();
        _connection.Dispose();
    }
}
