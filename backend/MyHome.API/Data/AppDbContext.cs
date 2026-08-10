using Microsoft.EntityFrameworkCore;
using MyHome.API.Models;

namespace MyHome.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<MaintenanceItem> MaintenanceItems => Set<MaintenanceItem>();
    public DbSet<MaintenanceLog> MaintenanceLogs => Set<MaintenanceLog>();
    public DbSet<Todo> Todos => Set<Todo>();
    public DbSet<LogAttachment> LogAttachments => Set<LogAttachment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "잔디/정원", Icon = "🌿", Color = "green" },
            new Category { Id = 2, Name = "자동차", Icon = "🚗", Color = "blue" },
            new Category { Id = 3, Name = "집 내부", Icon = "🏠", Color = "orange" },
            new Category { Id = 4, Name = "기타", Icon = "🔧", Color = "gray" }
        );
    }
}
