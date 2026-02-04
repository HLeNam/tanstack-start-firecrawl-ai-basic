import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Copy, Inbox } from 'lucide-react'
import { z } from 'zod'
import { zodValidator } from '@tanstack/zod-adapter'
import { Suspense, use, useEffect, useState } from 'react'
import { getItemsFn } from '@/data/items'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { copyToClipboard } from '@/lib/clipboard'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ItemStatus } from '@/generated/prisma/enums'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'

const itemsSearchSchema = z.object({
  q: z.string().default(''),
  status: z.union([z.literal('all'), z.nativeEnum(ItemStatus)]).default('all'),
})

type ItemsSearch = z.infer<typeof itemsSearchSchema>

export const Route = createFileRoute('/dashboard/items/')({
  component: RouteComponent,
  loader: () => ({ itemsPromise: getItemsFn() }),
  validateSearch: zodValidator(itemsSearchSchema),
  head: () => ({
    meta: [
      {
        title: 'Dashboard - Saved Items',
      },
      {
        property: 'og:title',
        content: 'Dashboard - Saved Items',
      },
    ],
  }),
})

function ItemGridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="overflow-hidden pt-0">
          <Skeleton className="aspect-video w-full" />
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="size-8 rounded-full" />
            </div>

            {/* Title */}
            <Skeleton className="h-6 w-full" />

            {/* Author */}
            <Skeleton className="h-4 w-40" />
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

function ItemList({
  data,
  q,
  status,
}: {
  q: ItemsSearch['q']
  status: ItemsSearch['status']
  data: ReturnType<typeof getItemsFn>
}) {
  const items = use(data)

  const filteredItems = items.filter((item) => {
    const matchesQuery =
      q === '' ||
      item.title?.toLowerCase().includes(q.toLowerCase()) ||
      item.tags.some((tag) => tag.toLowerCase().includes(q.toLowerCase()))

    const matchesStatus = status === 'all' || item.status === status

    return matchesQuery && matchesStatus
  })

  if (filteredItems.length === 0) {
    return (
      <Empty className="border rounded-lg h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox className="size-12" />
          </EmptyMedia>
          <EmptyTitle>
            {items.length === 0 ? 'No items saved yet' : 'No items found'}
          </EmptyTitle>
          <EmptyDescription>
            {items.length === 0
              ? 'Import a URL to get started saving items.'
              : 'No items match your search or filter criteria.'}
          </EmptyDescription>
        </EmptyHeader>
        {items.length === 0 && (
          <EmptyContent>
            <Link to="/dashboard/import" className={buttonVariants()}>
              Import URL
            </Link>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {filteredItems.map((item) => (
        <Card
          key={item.id}
          className="group overflow-hidden transition-all hover:shadow-lg pt-0"
        >
          <Link
            to="/dashboard/items/$itemId"
            params={{
              itemId: item.id,
            }}
            className="block"
          >
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <img
                src={
                  item.ogImage ??
                  'https://marketplace.canva.com/EAD2962NKnQ/2/0/1600w/canva-rainbow-gradient-pink-and-purple-virtual-background-_Tcjok-d9b4.jpg'
                }
                alt={item.title ?? 'Article Thumbnail'}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>

            <CardHeader className="space-y-4 pt-4">
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant={
                    item.status === 'COMPLETED' ? 'default' : 'secondary'
                  }
                >
                  {item.status.toLowerCase()}
                </Badge>
                <Button
                  onClick={async (e) => {
                    e.preventDefault()
                    await copyToClipboard(item.url)
                  }}
                  variant="outline"
                  size="icon"
                  className="size-8"
                >
                  <Copy className="size-4" />
                </Button>
              </div>

              <CardTitle className="line-clamp-1 text-xl leading-snug group-hover:text-primary transition-colors">
                {item.title || 'Untitled Item'}
              </CardTitle>

              {item.author && (
                <p className="text-xs text-muted-foreground">{item.author}</p>
              )}

              {item.summary && (
                <CardDescription className="line-clamp-3 text-sm">
                  {item.summary}
                </CardDescription>
              )}

              {/* Tags */}
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {item.tags.slice(0, 4).map((tag, index) => (
                    <Badge variant="secondary" key={index}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
          </Link>
        </Card>
      ))}
    </div>
  )
}

function RouteComponent() {
  const { itemsPromise } = Route.useLoaderData()

  const { q, status } = Route.useSearch()

  const [searchInput, setSearchInput] = useState(q)

  const navigate = useNavigate({ from: Route.fullPath })

  useEffect(() => {
    if (searchInput === q) {
      return
    }

    const timeout = setTimeout(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          q: searchInput,
        }),
      })
    }, 500)

    return () => clearTimeout(timeout)
  }, [searchInput, q, navigate])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Saved Items</h1>
        <p className="text-muted-foreground">
          Your saved articles and content!
        </p>
      </div>

      {/* Search and Filter controls */}
      <div className="flex gap-4">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by title or tags"
        />
        <Select
          value={status}
          onValueChange={(value) =>
            navigate({
              search: (prev) => ({ ...prev, status: value as typeof status }),
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.values(ItemStatus).map((_status) => (
              <SelectItem key={_status} value={_status}>
                {_status.charAt(0) + _status.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Suspense fallback={<ItemGridSkeleton />}>
        <ItemList data={itemsPromise} q={q} status={status} />
      </Suspense>
    </div>
  )
}
