"use client";
import { useState, useRef, useEffect, FormEvent } from "react";
import {
  ChatCompletionRequestMessage,
  CreateChatCompletionResponse,
} from "openai";
import ChatBubble from "@/components/ChatBubble";

function Chatty() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    ChatCompletionRequestMessage[]
  >([]);
  const scrollToDiv = useRef<HTMLDivElement | null>(null);

  function scrollToBottom() {
    setTimeout(function () {
      scrollToDiv.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    }, 100);
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const messages = [
      ...chatMessages,
      { role: "user", content: query } as ChatCompletionRequestMessage,
    ];
    setChatMessages(messages);

    setQuery("");
    const response = await fetch("http://localhost:8000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) {
      handleError(response.statusText);
    }
    const json = (await response.json()) as CreateChatCompletionResponse;
    scrollToBottom();
    try {
      setLoading(false);
      setChatMessages((m) => [
        ...m,
        json.choices[0].message as ChatCompletionRequestMessage,
      ]);
      setAnswer("");
    } catch (error) {
      if (error instanceof Error) {
        handleError(error.message);
      }
    }
  };

  function handleError(err: string) {
    setLoading(false);
    setQuery("");
    setAnswer("");
    console.error(err);
  }

  useEffect(() => {
    if (scrollToDiv.current) {
      scrollToDiv.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, answer, loading]);

  return (
    <div className="flex flex-col pt-4 w-full px-8 items-center gap-2">
      <div>
        <h1 className="text-2xl font-bold w-full text-center">Cappuccino 💛</h1>
      </div>
      <div className="h-96 w-full bg-gray-900 rounded-md p-4 overflow-y-auto flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <ChatBubble type="assistant" message="¿Cómo puedo ayudarte hoy?" />
          {chatMessages.map((message, index) => (
            <ChatBubble
              key={index}
              type={message.role}
              message={message.content}
            />
          ))}
          {answer && <ChatBubble type="assistant" message={answer} />}
          {loading && <ChatBubble type="assistant" message="Loading.." />}
        </div>
        <div ref={scrollToDiv} />
      </div>
      <form
        className="flex w-full rounded-md gap-4 bg-gray-900 p-4"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          className="border-2 border-gray-500 rounded-md py-2 px-4 w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default Chatty;
