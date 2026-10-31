import React, { useState } from 'react';
import {
  DetectedEntity,
  EntityCategory,
} from '../../types/index.ts';
import {
  Filter,
  Shield,
} from 'lucide-react';

interface EntityInspectorProps {
  entities: DetectedEntity[];
  transformations: Array<{
    id: string;
    category: EntityCategory;
    maskedSnippet: string;
    strategyApplied: string;
  }>;
  onSelectEntity?: (entity: DetectedEntity) => void;
}

export const EntityInspector: React.FC<EntityInspectorProps> = ({
  entities,
  transformations,
  onSelectEntity,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = Array.from(new Set(entities.map((e) => e.category)));

  const filteredEntities = entities.filter(
    (e) => selectedCategory === 'ALL' || e.category === selectedCategory
  );

  return (
    <div className="bg-[#101f3b] rounded-xl border border-[#263e65] shadow-xs overflow-hidden">
      <div className="px-3 sm:px-5 py-3.5 bg-[#142541] border-b border-[#263e65] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-300" />
          <h3 className="text-sm font-bold text-slate-100">
            Detected Entities &amp; Token Transformations
          </h3>
          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-cyan-400/10 text-cyan-200 rounded-md">
            {entities.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#0a1830] border border-[#345078] rounded-md px-2 py-1 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <option value="ALL">All Categories ({entities.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ')} ({entities.filter((e) => e.category === cat).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredEntities.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs">
          No matching sensitive entities in this category.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#162a49] text-slate-400 sticky top-0 z-10 font-semibold border-b border-[#263e65]">
              <tr>
                <th className="py-2.5 px-4">Entity ID</th>
                <th className="py-2.5 px-4">Classification</th>
                <th className="py-2.5 px-4">Detected Value</th>
                <th className="py-2.5 px-4">Masked Output</th>
                <th className="py-2.5 px-4">Confidence</th>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4 text-right">Offsets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263e65]">
              {filteredEntities.map((entity, idx) => {
                const trans = transformations.find((t) => t.id === entity.id);
                const isCritical = entity.severity === 'critical';
                const isHigh = entity.severity === 'high';

                return (
                  <tr
                    key={entity.id || idx}
                    onClick={() => onSelectEntity?.(entity)}
                    className="hover:bg-cyan-400/10 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                      #{entity.id}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-100">
                      <div className="font-semibold text-slate-200">{entity.categoryLabel}</div>
                      <div className="text-[10px] font-mono text-slate-500">{entity.ruleTriggered}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs">
                      <span className="text-slate-500 italic flex items-center gap-1">
                        Protected value
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-emerald-300 bg-emerald-400/10">
                      {trans?.maskedSnippet || `<${entity.category}>`}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      {Math.round(entity.confidence * 100)}%
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                          isCritical
                            ? 'text-rose-300'
                            : isHigh
                            ? 'text-amber-300'
                            : 'text-cyan-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCritical
                              ? 'bg-rose-500'
                              : isHigh
                              ? 'bg-amber-400'
                              : 'bg-cyan-400'
                          }`}
                        />
                        <span className="uppercase">{entity.severity}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[11px] text-slate-500">
                      [{entity.startIndex}:{entity.endIndex}]
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
