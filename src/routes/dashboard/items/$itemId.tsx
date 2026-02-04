import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { getItemByIdFn, saveSummaryAndGenerateTagsFn } from '@/data/items'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { MessageResponse } from '@/components/ai-elements/message'

export const Route = createFileRoute('/dashboard/items/$itemId')({
  component: RouteComponent,
  loader: ({ params }) =>
    getItemByIdFn({
      data: {
        id: params.itemId,
      },
    }),

  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title ?? 'Dashboard - Item Details',
      },
      {
        property: 'og:image',
        content: loaderData?.ogImage ?? '',
      },
      {
        name: 'twitter:title',
        content: loaderData?.title ?? 'Dashboard - Item Details',
      },
    ],
  }),
})

function RouteComponent() {
  const data = Route.useLoaderData()

  const [contentOpen, setContentOpen] = useState(false)

  const router = useRouter()

  const { completion, complete, isLoading } = useCompletion({
    api: '/api/ai/summary',
    initialCompletion: data.summary ? data.summary : undefined,
    streamProtocol: 'text',
    body: {
      itemId: data.id,
    },
    onFinish: async (_prompt, completionText) => {
      await saveSummaryAndGenerateTagsFn({
        data: {
          id: data.id,
          summary: completionText,
        },
      })

      toast.success('Summary and tags generated successfully!')

      router.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function handleGenerateSummary() {
    if (!data.content) {
      toast.error('No content available to summarize.')
      return
    }

    complete(data.content)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 w-full">
      <div className="flex justify-start">
        <Link
          to="/dashboard/items"
          className={buttonVariants({
            variant: 'outline',
          })}
        >
          <ArrowLeft />
          Go Back
        </Link>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        <img
          src={
            data.ogImage ??
            'https://marketplace.canva.com/EAD2962NKnQ/2/0/1600w/canva-rainbow-gradient-pink-and-purple-virtual-background-_Tcjok-d9b4.jpg'
          }
          alt={data.title ?? 'Item Image'}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {data.title ?? 'Untitled Item'}
        </h1>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {data.author && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" />
              {data.author}
            </span>
          )}

          {data.publishedAt && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" />
              {new Date(data.publishedAt).toLocaleDateString('en-US')}
            </span>
          )}

          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            Saved {new Date(data.createdAt).toLocaleDateString('en-US')}
          </span>
        </div>

        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
        >
          View Original
          <ExternalLink className="size-3.5" />
        </a>

        {/* Tags */}
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}

        {/* Summary Section */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 w-full">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                  Summary
                </h2>

                {completion || data.summary ? (
                  <MessageResponse>{completion}</MessageResponse>
                ) : (
                  <p className="text-muted-foreground italic">
                    {data.content
                      ? 'No summary yet. Generate one with AI.'
                      : 'No content available to summarize.'}
                  </p>
                )}
              </div>

              {data.content && !data.summary && (
                <Button
                  disabled={isLoading}
                  size="sm"
                  onClick={handleGenerateSummary}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content Section */}
        {data.content && (
          <Collapsible open={contentOpen} onOpenChange={setContentOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="font-medium">Full Content</span>
                <ChevronDown
                  className={cn(
                    contentOpen ? 'rotate-180' : '',
                    'transition-transform size-4 duration-200',
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card>
                <CardContent>
                  <MessageResponse>{data.content}</MessageResponse>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  )
}
