using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

public class SmtpOptions
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string User { get; set; } = "";
    public string Pass { get; set; } = "";
    public string From { get; set; } = "no-reply@suaclinica.com";
    public string FromName { get; set; } = "DentistrySched";
}

public class EmailSender : IEmailSender
{
    private readonly SmtpOptions _opt;
    public EmailSender(IOptions<SmtpOptions> opt) => _opt = opt.Value;

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        using var client = new SmtpClient(_opt.Host, _opt.Port)
        {
            EnableSsl = _opt.EnableSsl,
            Credentials = new NetworkCredential(_opt.User, _opt.Pass)
        };

        using var msg = new MailMessage
        {
            From = new MailAddress(_opt.From, _opt.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        msg.To.Add(to);

        await Task.Run(() => client.Send(msg), ct);
    }
}
