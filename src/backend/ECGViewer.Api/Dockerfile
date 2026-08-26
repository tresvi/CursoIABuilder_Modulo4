# syntax=docker/dockerfile:1

# --- Build stage ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ECGViewer.Api/ECGViewer.Api.csproj ECGViewer.Api/
RUN dotnet restore ECGViewer.Api/ECGViewer.Api.csproj

COPY ECGViewer.Api/ ECGViewer.Api/
RUN dotnet publish ECGViewer.Api/ECGViewer.Api.csproj -c Release -o /app/publish --no-restore

# --- Runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "ECGViewer.Api.dll"]
