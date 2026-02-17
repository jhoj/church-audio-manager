using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ChurchAudio.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace ChurchAudio.Api.Services;

public class TokenService(IConfiguration config)
{
    public string Generate(AdminUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Name, user.Username)],
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
