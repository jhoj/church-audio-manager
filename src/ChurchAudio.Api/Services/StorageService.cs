using Minio;
using Minio.DataModel.Args;
using Minio.DataModel;

namespace ChurchAudio.Api.Services;

public record ObjectInfo(long Size, string ContentType);

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

    public async Task<ObjectInfo> StatAsync(string key)
    {
        var stat = await minio.StatObjectAsync(new StatObjectArgs()
            .WithBucket(_bucket)
            .WithObject(key));
        return new ObjectInfo(stat.Size, stat.ContentType);
    }

    // Stream a byte range from MinIO directly into the response body.
    // offset and length map to MinIO's native range-get — only the requested
    // bytes are transferred over the wire from MinIO to this server.
    public async Task StreamRangeAsync(
        string key,
        Stream destination,
        long offset,
        long length,
        CancellationToken ct = default)
    {
        await minio.GetObjectAsync(new GetObjectArgs()
            .WithBucket(_bucket)
            .WithObject(key)
            .WithOffsetAndLength(offset, length)
            .WithCallbackStream(async (src, innerCt) =>
            {
                using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct, innerCt);
                await src.CopyToAsync(destination, 81920, linked.Token);
            }), ct);
    }

    public async Task DeleteAsync(string key)
    {
        await minio.RemoveObjectAsync(new RemoveObjectArgs()
            .WithBucket(_bucket)
            .WithObject(key));
    }
}
