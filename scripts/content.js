async function receiveBlueskyTwitterCrossPost(msg, sender, sendResponse) {
  if (msg.type !== "bluesky_twitter_cross_post") {
    return;
  }
  console.log("Message received:");
  console.log(msg);

  const input = document.querySelector("[contenteditable='true']");
  // const input = document.querySelector("[role='textbox']");

  input.focus();
  document.execCommand('insertText', false, msg.post.text);

  // TODO - trigger image upload

  // Don't post tweets while debugging
  return;

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const button = document.querySelector("[data-testid='tweetButtonInline']");
  button.click();

  chrome.tabs.remove(createdTab.id);
}

chrome.runtime.onMessage.addListener(receiveBlueskyTwitterCrossPost);
