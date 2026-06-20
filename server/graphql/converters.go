package graphql

import (
	"github.com/tasuku43/vivi/server/application"
	"github.com/tasuku43/vivi/server/gitreview"
	"github.com/tasuku43/vivi/server/graphql/model"
	"github.com/tasuku43/vivi/server/workspace"
)

func viewerConfigFromDomain(config workspace.Config) *model.ViewerConfig {
	return &model.ViewerConfig{
		Root:             config.Root,
		AllowHTMLScripts: config.AllowHTMLScripts,
		MaxFileSizeBytes: int(config.MaxFileSizeBytes),
	}
}

func commentsFromMaps(items []map[string]any) []*model.Comment {
	comments := make([]*model.Comment, 0, len(items))
	for _, item := range items {
		comments = append(comments, commentFromMap(item))
	}
	return comments
}

func commentFromMap(item map[string]any) *model.Comment {
	return &model.Comment{
		ID:         stringValue(item["id"]),
		ThreadID:   optionalStringValue(item["threadId"]),
		Path:       stringValue(item["path"]),
		ViewerKind: stringValue(item["viewerKind"]),
		Anchor:     mapValue(item["anchor"]),
		DiffAnchor: diffAnchorValue(item["anchor"]),
		Body:       stringValue(item["body"]),
		Author:     optionalStringValue(item["author"]),
		Source:     commentSourceValue(item["source"]),
		Status:     commentStatusValue(item["status"]),
		CreatedAt:  stringValue(item["createdAt"]),
		UpdatedAt:  stringValue(item["updatedAt"]),
		ResolvedAt: optionalStringValue(item["resolvedAt"]),
		ArchivedAt: optionalStringValue(item["archivedAt"]),
	}
}

func commentThreadsFromDomain(items []application.CommentThread) []*model.CommentThread {
	threads := make([]*model.CommentThread, 0, len(items))
	for _, item := range items {
		threads = append(threads, &model.CommentThread{
			ID:         item.ID,
			Path:       item.Path,
			Status:     commentStatusValue(item.Status),
			Anchor:     mapValue(item.Anchor),
			DiffAnchor: diffAnchorValue(item.Anchor),
			UpdatedAt:  optionalStringValue(item.UpdatedAt),
			CreatedAt:  item.CreatedAt,
			ResolvedAt: optionalStringValue(item.ResolvedAt),
			ArchivedAt: optionalStringValue(item.ArchivedAt),
			Comments:   commentsFromMaps(item.Comments),
		})
	}
	return threads
}

func diffAnchorValue(value any) *model.DiffCommentAnchor {
	anchor := mapValue(value)
	diff := mapValue(anchor["diff"])
	if len(diff) == 0 {
		return nil
	}
	side := model.DiffSide(stringValue(diff["side"]))
	if side == "current" {
		side = model.DiffSideNew
	}
	if !side.IsValid() {
		return nil
	}
	return &model.DiffCommentAnchor{
		Path: stringValue(diff["path"]), Base: defaultString(diff["base"], "HEAD"),
		Ref: defaultString(diff["ref"], "working-tree"), HunkID: defaultString(diff["hunkId"], "legacy"), Side: side,
		OldLineStart: optionalJSONInt(diff["oldLineStart"]), OldLineEnd: optionalJSONInt(diff["oldLineEnd"]),
		NewLineStart: firstJSONInt(diff["newLineStart"], diff["lineStart"]), NewLineEnd: firstJSONInt(diff["newLineEnd"], diff["lineEnd"]),
		DiffHash: optionalStringValue(diff["diffHash"]), FileHash: optionalStringValue(diff["fileHash"]),
	}
}

func defaultString(value any, fallback string) string {
	if text := stringValue(value); text != "" {
		return text
	}
	return fallback
}
func optionalJSONInt(value any) *int {
	if number, ok := value.(float64); ok {
		result := int(number)
		return &result
	}
	if number, ok := value.(int); ok {
		return &number
	}
	return nil
}
func firstJSONInt(values ...any) *int {
	for _, value := range values {
		if result := optionalJSONInt(value); result != nil {
			return result
		}
	}
	return nil
}

func workspaceEventFromDomain(event application.WorkspaceEvent) *model.WorkspaceEvent {
	result := &model.WorkspaceEvent{
		Type:    event.Type,
		Path:    event.Path,
		Version: event.Version,
	}
	if event.Kind != "" {
		kind := model.NodeKind(event.Kind)
		if kind.IsValid() {
			result.Kind = &kind
		}
	}
	return result
}

func reviewSummaryFromDomain(summary gitreview.Summary) *model.ChangeReviewSummary {
	changes := make([]*gitreview.Change, 0, len(summary.Changes))
	for index := range summary.Changes {
		changes = append(changes, &summary.Changes[index])
	}
	return &model.ChangeReviewSummary{
		Available: summary.Available,
		Reason:    optionalStringValue(summary.Reason),
		Changes:   changes,
	}
}

func nodesFromDomain(nodes []workspace.Node) []*model.FsNode {
	result := make([]*model.FsNode, 0, len(nodes))
	for _, node := range nodes {
		result = append(result, nodeFromDomain(node))
	}
	return result
}

func nodeFromDomain(node workspace.Node) *model.FsNode {
	return &model.FsNode{
		ID:             node.ID,
		Path:           node.Path,
		Name:           node.Name,
		Kind:           model.NodeKind(node.Kind),
		ParentPath:     node.ParentPath,
		ViewerKind:     optionalStringValue(node.ViewerKind),
		Children:       nodesFromDomain(node.Children),
		ChildrenLoaded: node.ChildrenLoaded,
		Size:           optionalInt64Value(node.Size),
		MtimeMs:        optionalFloatValue(node.MtimeMs),
		Version:        optionalIntValue(node.Version),
	}
}

func commentInputMap(input model.CommentInput) map[string]any {
	result := map[string]any{
		"path":   input.Path,
		"anchor": input.Anchor,
		"body":   input.Body,
	}
	if input.ViewerKind != nil {
		result["viewerKind"] = *input.ViewerKind
	}
	if input.ThreadID != nil {
		result["threadId"] = *input.ThreadID
	}
	if input.Status != nil {
		result["status"] = input.Status.String()
	}
	if input.Author != nil {
		result["author"] = *input.Author
	}
	if input.Source != nil {
		result["source"] = commentSourceStorageValue(*input.Source)
	}
	return result
}

func addCommentInputMap(input model.AddCommentInput) map[string]any {
	result := map[string]any{"body": input.Body}
	if input.Author != nil {
		result["author"] = *input.Author
	}
	if input.Source != nil {
		result["source"] = commentSourceStorageValue(*input.Source)
	}
	return result
}

func commentUpdateInputMap(input model.CommentUpdateInput) map[string]any {
	result := map[string]any{}
	if input.Body != nil {
		result["body"] = *input.Body
	}
	if input.Status != nil {
		result["status"] = input.Status.String()
	}
	return result
}

func commentFilters(path *string, status *model.CommentStatus) (string, string) {
	statusValue := ""
	if status != nil {
		statusValue = status.String()
	}
	pathValue := ""
	if path != nil {
		pathValue = *path
	}
	return pathValue, statusValue
}

func commentStatusValue(value any) model.CommentStatus {
	status := model.CommentStatus(stringValue(value))
	if status.IsValid() {
		return status
	}
	return model.CommentStatusOpen
}

func commentSourceValue(value any) model.CommentSource {
	if stringValue(value) == "claude-code" {
		return model.CommentSourceClaudeCode
	}
	source := model.CommentSource(stringValue(value))
	if source.IsValid() {
		return source
	}
	return model.CommentSourceUnknown
}
func commentSourceStorageValue(value model.CommentSource) string {
	if value == model.CommentSourceClaudeCode {
		return "claude-code"
	}
	return value.String()
}

func mapValue(value any) map[string]any {
	if typed, ok := value.(map[string]any); ok {
		return typed
	}
	return map[string]any{}
}

func stringValue(value any) string {
	typed, _ := value.(string)
	return typed
}

func optionalStringValue(value any) *string {
	typed := stringValue(value)
	if typed == "" {
		return nil
	}
	return &typed
}

func optionalInt64Value(value int64) *int {
	if value == 0 {
		return nil
	}
	typed := int(value)
	return &typed
}

func optionalIntValue(value int) *int {
	if value == 0 {
		return nil
	}
	return &value
}

func optionalFloatValue(value float64) *float64 {
	if value == 0 {
		return nil
	}
	return &value
}
