using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Azure.WebJobs.Host;
using Microsoft.Extensions.Logging;
using System;

namespace VersioningSample
{
    public static class VersioningSample
    {
        [FunctionName("VersioningSample_1_0_6")]
        public static async Task<List<string>> RunOrchestrator(
            [OrchestrationTrigger] DurableOrchestrationContext context)
        {
            var outputs = new List<string>();

            // Replace "hello" with the name of your Durable Activity Function.
            outputs.Add(await context.CallActivityAsync<string>("VersioningSample_Hello_1_0_6", "Tokyo"));
            outputs.Add(await context.CallActivityAsync<string>("VersioningSample_Hello_1_0_6", "Seattle"));
            outputs.Add(await context.CallActivityAsync<string>("VersioningSample_Hello_1_0_6", "London"));

            // returns ["Hello Tokyo!", "Hello Seattle!", "Hello London!"]
            return outputs;
        }

        [FunctionName("VersioningSample_Hello_1_0_6")]
        public static async Task<string> SayHello([ActivityTrigger] string name, ILogger log)
        {
            log.LogInformation($"Saying hello to {name}.");
            log.LogInformation($"Waiting for the long runing job... for 3 min");
            await Task.Delay(TimeSpan.FromSeconds(30));
            return $"Hello {name}!";
        }

        [FunctionName("VersioningSample_HttpStart_1_0_6")]
        public static async Task<HttpResponseMessage> HttpStart(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")]HttpRequestMessage req,
            [OrchestrationClient]DurableOrchestrationClient starter,
            ILogger log)
        {
            // Function input comes from the request content.
            string instanceId = await starter.StartNewAsync("VersioningSample_1_0_6", null);

            log.LogInformation($"Started orchestration with ID = '{instanceId}'.");

            return starter.CreateCheckStatusResponse(req, instanceId);
        }
    }
}