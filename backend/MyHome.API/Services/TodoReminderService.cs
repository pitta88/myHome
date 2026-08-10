using Microsoft.EntityFrameworkCore;
using MyHome.API.Data;

namespace MyHome.API.Services;

public class TodoReminderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<TodoReminderService> _logger;
    private readonly HttpClient _http = new();

    public TodoReminderService(IServiceScopeFactory scopeFactory, IConfiguration config, ILogger<TodoReminderService> logger)
    {
        _scopeFactory = scopeFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = TimeUntilNext10Am();
            _logger.LogInformation("다음 알림 전송까지 {delay} 대기", delay);
            await Task.Delay(delay, stoppingToken);

            await SendRemindersAsync();
        }
    }

    private static TimeSpan TimeUntilNext10Am()
    {
        var now = DateTime.Now;
        var next = DateTime.Today.AddHours(10);
        if (now >= next) next = next.AddDays(1);
        return next - now;
    }

    private async Task SendRemindersAsync()
    {
        var botToken = _config["Telegram:BotToken"];
        var chatId = _config["Telegram:ChatId"];
        if (string.IsNullOrEmpty(botToken) || string.IsNullOrEmpty(chatId)) return;

        var tomorrow = DateTime.Today.AddDays(1).ToString("yyyy-MM-dd");

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var todos = await db.Todos
            .Include(t => t.Category)
            .Where(t => !t.IsCompleted && t.DueDate != null &&
                        t.DueDate.Value.Date == DateTime.Today.AddDays(1).Date)
            .ToListAsync();

        if (!todos.Any()) return;

        var lines = todos.Select(t => $"• {t.Category.Icon} {t.Title}");
        var message = $"📋 *내일 예정된 할 일* ({tomorrow})\n\n{string.Join("\n", lines)}";

        var url = $"https://api.telegram.org/bot{botToken}/sendMessage";
        var payload = new { chat_id = chatId, text = message, parse_mode = "Markdown" };

        try
        {
            var res = await _http.PostAsJsonAsync(url, payload);
            _logger.LogInformation("텔레그램 알림 전송 완료: {count}개", todos.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "텔레그램 알림 전송 실패");
        }
    }
}
