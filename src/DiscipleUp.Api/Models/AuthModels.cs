using System.ComponentModel.DataAnnotations;

namespace DiscipleUp.Api.Models;

public record RegisterRequest(
    [Required] string FirstName,
    [Required] string LastName,
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required] DateOnly DateOfBirth,
    [Required] string Timezone,
    string? ParentEmail
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record RefreshRequest(
    [Required] string RefreshToken
);

public record ForgotPasswordRequest(
    [Required, EmailAddress] string Email
);

public record ResetPasswordRequest(
    [Required, EmailAddress] string Email,
    [Required] string Token,
    [Required, MinLength(8)] string NewPassword
);

public record CompleteParentalConsentRequest(
    [Required] string Token,
    [Required] string FirstName,
    [Required] string LastName,
    [Required, MinLength(8)] string Password
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    string UserId,
    string Email,
    string FirstName,
    string Role,
    string Status
);
