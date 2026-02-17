using Minio;
using Minio.DataModel.Args;

namespace ChurchAudio.Api.Services;

public class StorageService(IMinioClient minio, IConfiguration config)
{
    private readonly string _bucket = config["Minio:Bucket"] ?? "church-audio";

    public async Task EnsureBucketAsync()
    {
        var exists = await minio.BucketExistsAsync(new BucketExistsArgs().WithBucket(_bucket));
        if (!exists)
            await minio.MakeBucketAsync(new MakeBucketArgs().WithBucket(_bucket));
    }

    public async Task<string> UploadAsync(Stream stream, string fileName, string contentType)
    {
        var key = $"{Guid.NewGuid()}/{fileName}";
        await minio.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_bucket)
            .WithObject(key)
            .WithStreamData(stream)
            .WithObjectSize(stream.Length)
            .WithContentType(contentType));
        return key;
    }

    // Returns a pre-signed URL valid for 1 hour — safe to expose to the widget
    public async Task<string> GetPresignedUrlAsync(string key, int expirySeconds = 3600)
    {
        return await minio.PresignedGetObjectAsync(new PresignedGetObjectArgs()
            .WithBucket(_bucket)
            .WithObject(key)
            .WithExpiry(expirySeconds));
    }

    public async Task DeleteAsync(string key)
    {
        await minio.RemoveObjectAsync(new RemoveObjectArgs()
            .WithBucket(_bucket)
            .WithObject(key));
    }
}
